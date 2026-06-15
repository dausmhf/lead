import type {
  Account,
  AccountType,
  PipelineStage,
  ProspectOwner,
  WhatsAppContact,
  WhatsAppFollowUpTask,
  WhatsAppLeadSignal,
  WhatsAppMessage,
  WhatsAppSettings,
  WhatsAppTemplate
} from "../../shared/types";
import { readDb, updateDb } from "../data/store";

interface SendInput {
  account: Account;
  to?: string;
  body: string;
}

interface SendContactInput {
  contactPhone: string;
  body: string;
  accountId?: string;
  contactName?: string;
  signal?: WhatsAppLeadSignal;
}

interface ProviderResult {
  externalId?: string;
  status: WhatsAppMessage["status"];
  statusMessage?: string;
  raw?: unknown;
}

class WhatsAppProviderError extends Error {
  raw?: unknown;

  constructor(message: string, raw?: unknown) {
    super(message);
    this.name = "WhatsAppProviderError";
    this.raw = raw;
  }
}

export function normalizeWaNumber(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function validateWaNumber(phone: string): string | undefined {
  if (!/^\d{8,15}$/.test(phone)) {
    return "Nomor WhatsApp harus berisi 8-15 digit dengan kode negara, contoh 628123456789.";
  }
  if (phone.startsWith("62") && !phone.startsWith("628")) {
    return "Nomor Indonesia untuk WhatsApp biasanya diawali 628. Periksa kembali nomor tujuan.";
  }
  return undefined;
}

export function preferredWaNumber(account: Account): string {
  return normalizeWaNumber(account.phone || account.ownerPhone);
}

function defaultContactName(contact?: WhatsAppContact, account?: Account): string {
  const value = contact?.name || account?.ownerName || account?.decisionMaker || "";
  if (!value || value === "Belum diketahui") return "Kak";
  return value.split(" ")[0] || "Kak";
}

function accountMatchesPhone(account: Account, phone: string): boolean {
  const numbers = [account.phone, account.ownerPhone].map(normalizeWaNumber).filter(Boolean);
  return numbers.includes(phone);
}

export function findAccountByPhone(phone: string): Account | undefined {
  const normalized = normalizeWaNumber(phone);
  return readDb().accounts.find((account) => accountMatchesPhone(account, normalized));
}

export function generateWaDraft(account: Account): string {
  const product = account.offerMatch[0] ?? "Website Company Profile";
  const context = account.website
    ? "Aku sempat cek presence online-nya"
    : "Aku lagi mapping beberapa bisnis yang potensial buat dirapikan presence online-nya";

  return [
    `Halo Kak Admin ${account.name}, saya Daus.`,
    `${context} ${account.name}. Kayaknya ${account.industry} seperti ini bisa kebantu dengan ${product}, terutama biar calon client lebih gampang percaya dan langsung klik WhatsApp.`,
    "Boleh saya kirim audit singkat/ide perapihan websitenya? Santai, nanti kalau belum relevan juga gapapa."
  ].join(" ");
}

export function renderWaTemplate(template: WhatsAppTemplate, input: { contact?: WhatsAppContact; account?: Account }): string {
  const product = input.account?.offerMatch[0] ?? "Website Company Profile";
  const values: Record<string, string> = {
    contactName: defaultContactName(input.contact, input.account),
    businessName: input.account?.name || input.contact?.name || "bisnisnya",
    product,
    city: input.account?.location || "",
    industry: input.account?.industry || ""
  };
  return template.body.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
}

export function classifyWaText(text: string): WhatsAppLeadSignal {
  const value = text.toLowerCase();
  if (/(^|\s)(tidak|nggak|ngga|ga|gak)(\s|$)|belum butuh|stop|jangan|remove/.test(value)) return "rejected";
  if (/(salah nomor|bukan|siapa ini|nomor tidak)/.test(value)) return "not_valid";
  if (/(harga|biaya|price|paket|berapa|budget)/.test(value)) return "ask_price";
  if (/(meeting|meet|zoom|call|jadwal|ketemu|besok|lusa|minggu ini)/.test(value)) return "meeting";
  if (/(tertarik|boleh|lanjut|kirim|mau|iya|ya|ok|oke|deal)/.test(value)) return "hot";
  if (/(nanti|follow up|dipikir|cek dulu|diskusi)/.test(value)) return "warm";
  return "unknown";
}

export function stageFromSignal(signal: WhatsAppLeadSignal, currentStage: PipelineStage): PipelineStage {
  if (signal === "meeting") return "Meeting";
  if (signal === "ask_price" || signal === "hot") return "Chat Management";
  if (signal === "rejected" || signal === "not_valid") return "Ditolak";
  if (currentStage === "Belum Dihubungi") return "Chat Admin";
  return currentStage;
}

function upsertContact(input: {
  phone: string;
  name?: string;
  accountId?: string;
  signal?: WhatsAppLeadSignal;
  inbound?: boolean;
  createdAt?: string;
}): WhatsAppContact {
  const phone = normalizeWaNumber(input.phone);
  const createdAt = input.createdAt ?? new Date().toISOString();
  let nextContact: WhatsAppContact | undefined;
  updateDb((db) => {
    const existing = db.whatsappContacts.find((contact) => contact.phone === phone);
    const matchedAccount = input.accountId
      ? db.accounts.find((account) => account.id === input.accountId)
      : db.accounts.find((account) => accountMatchesPhone(account, phone));
    if (existing) {
      existing.name = input.name || existing.name || matchedAccount?.name;
      existing.accountId = input.accountId || existing.accountId || matchedAccount?.id;
      existing.classification = input.signal && input.signal !== "unknown" ? input.signal : existing.classification;
      existing.status = existing.accountId ? "linked" : existing.status;
      existing.lastMessageAt = createdAt;
      existing.unreadCount += input.inbound ? 1 : 0;
      existing.updatedAt = createdAt;
      nextContact = existing;
      return;
    }
    nextContact = {
      id: `wac-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      phone,
      name: input.name || matchedAccount?.name,
      accountId: input.accountId || matchedAccount?.id,
      classification: input.signal ?? "unknown",
      status: matchedAccount ? "linked" : "new",
      lastMessageAt: createdAt,
      unreadCount: input.inbound ? 1 : 0,
      createdAt
    };
    db.whatsappContacts.unshift(nextContact);
  });
  return nextContact!;
}

async function sendViaStarsender(settings: WhatsAppSettings, input: SendInput): Promise<ProviderResult> {
  const apiKey = settings.starsenderApiKey || process.env.STARSENDER_API_KEY;
  if (!apiKey) throw new Error("Starsender API key belum diisi.");

  const baseUrl = settings.starsenderBaseUrl || process.env.STARSENDER_BASE_URL || "https://api.starsender.online/api";
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey
      },
      body: JSON.stringify({
        messageType: "text",
        to: input.to,
        body: input.body,
        delay: 3
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new WhatsAppProviderError(
      timedOut
        ? "Starsender tidak merespons dalam 15 detik. Periksa koneksi dan status device."
        : "Tidak dapat terhubung ke Starsender. Periksa koneksi, Base URL, dan status device."
    );
  }
  const responseText = await response.text();
  let raw: any;
  try {
    raw = responseText ? JSON.parse(responseText) : {};
  } catch {
    raw = { text: responseText };
  }
  if (!response.ok || raw?.success === false) {
    throw new WhatsAppProviderError(
      raw?.message ?? `Starsender menolak pesan (${response.status}).`,
      raw
    );
  }
  const providerMessageId = raw?.data?.message_id ?? raw?.data?.id;
  return {
    externalId: providerMessageId ? String(providerMessageId) : undefined,
    status: "queued",
    statusMessage: providerMessageId
      ? `Diterima gateway Starsender dengan message ID ${providerMessageId}. Delivery ke WhatsApp belum dikonfirmasi.`
      : "Diterima gateway Starsender. Delivery ke WhatsApp belum dikonfirmasi.",
    raw
  };
}

async function sendViaProvider(settings: WhatsAppSettings, input: SendInput): Promise<ProviderResult> {
  if (settings.provider === "starsender" && settings.enabled) {
    return sendViaStarsender(settings, input);
  }

  if (settings.provider === "waba" && settings.enabled) {
    throw new Error("Adapter WABA belum diaktifkan di MVP ini. Gunakan mock atau Starsender dulu.");
  }

  return {
    externalId: `mock-${Date.now()}`,
    status: "sent",
    statusMessage: "Pesan mock tersimpan lokal.",
    raw: { success: true, message: "Mock WhatsApp message recorded locally." }
  };
}

export async function sendWhatsAppMessage(input: SendInput): Promise<WhatsAppMessage> {
  const settings = readDb().whatsappSettings;
  const to = normalizeWaNumber(input.to || preferredWaNumber(input.account));
  if (!to) throw new Error("Nomor WhatsApp prospek belum ada.");

  const createdAt = new Date().toISOString();
  const messageBase: WhatsAppMessage = {
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountId: input.account.id,
    contactPhone: to,
    to,
    body: input.body,
    direction: "outbound",
    status: "queued",
    provider: settings.provider,
    signal: "cold",
    createdAt
  };

  try {
    const validationError = validateWaNumber(to);
    if (validationError) throw new WhatsAppProviderError(validationError);
    const sent = await sendViaProvider(settings, { ...input, to });
    const message = { ...messageBase, ...sent };
    updateDb((db) => {
      db.whatsappMessages.unshift(message);
      const account = db.accounts.find((item) => item.id === input.account.id);
      if (account && account.stage === "Belum Dihubungi") {
        account.stage = "Chat Admin";
        account.nextAction = "Pantau balasan WhatsApp dan klasifikasikan respon prospek.";
        account.lastContactAt = createdAt;
        account.updatedAt = createdAt;
      }
    });
    upsertContact({ phone: to, name: input.account.name, accountId: input.account.id, signal: "cold", createdAt });
    return message;
  } catch (error) {
    const message = {
      ...messageBase,
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Gagal mengirim WhatsApp.",
      raw: error instanceof WhatsAppProviderError ? error.raw : undefined
    };
    updateDb((db) => {
      db.whatsappMessages.unshift(message);
    });
    upsertContact({ phone: to, name: input.account.name, accountId: input.account.id, signal: "cold", createdAt });
    return message;
  }
}

export async function sendWhatsAppToContact(input: SendContactInput): Promise<WhatsAppMessage> {
  const settings = readDb().whatsappSettings;
  const to = normalizeWaNumber(input.contactPhone);
  if (!to) throw new Error("Nomor WhatsApp kontak belum ada.");
  const createdAt = new Date().toISOString();
  const db = readDb();
  const contact = db.whatsappContacts.find((item) => item.phone === to);
  const account = input.accountId
    ? db.accounts.find((item) => item.id === input.accountId)
    : contact?.accountId
      ? db.accounts.find((item) => item.id === contact.accountId)
      : findAccountByPhone(to);

  const messageBase: WhatsAppMessage = {
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountId: account?.id,
    contactPhone: to,
    to,
    body: input.body,
    direction: "outbound",
    status: "queued",
    provider: settings.provider,
    signal: input.signal ?? "cold",
    createdAt
  };

  try {
    const validationError = validateWaNumber(to);
    if (validationError) throw new WhatsAppProviderError(validationError);
    const sent = await sendViaProvider(settings, { account: account ?? ({
      id: input.accountId ?? "",
      name: input.contactName ?? contact?.name ?? to,
      type: "B2B",
      industry: "Belum diklasifikasi",
      location: "Indonesia",
      audienceSize: 0,
      budgetClass: "Menengah",
      decisionMaker: "Belum diketahui",
      problemHypothesis: "Kontak WhatsApp perlu screening manual.",
      offerMatch: ["Website Company Profile"],
      priorityScore: 50,
      dealValue: 0,
      stage: "Chat Admin",
      owner: "Daus"
    } as Account), to, body: input.body });
    const message = { ...messageBase, ...sent };
    updateDb((nextDb) => {
      nextDb.whatsappMessages.unshift(message);
      const linked = message.accountId ? nextDb.accounts.find((item) => item.id === message.accountId) : undefined;
      if (linked) {
        linked.lastContactAt = createdAt;
        if (linked.stage === "Belum Dihubungi") linked.stage = "Chat Admin";
        linked.nextAction = "Pantau balasan WhatsApp dari inbox.";
        linked.updatedAt = createdAt;
      }
    });
    upsertContact({ phone: to, name: input.contactName || contact?.name || account?.name, accountId: account?.id, signal: input.signal ?? "cold", createdAt });
    return message;
  } catch (error) {
    const message = {
      ...messageBase,
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Gagal mengirim WhatsApp.",
      raw: error instanceof WhatsAppProviderError ? error.raw : undefined
    };
    updateDb((nextDb) => {
      nextDb.whatsappMessages.unshift(message);
    });
    upsertContact({ phone: to, name: input.contactName || contact?.name || account?.name, accountId: account?.id, signal: input.signal ?? "cold", createdAt });
    return message;
  }
}

function mapStarsenderStatus(value?: string): WhatsAppMessage["status"] | undefined {
  const normalized = value?.toLowerCase().replace(/[\s-]+/g, "_");
  if (!normalized) return undefined;
  if (normalized.includes("read")) return "read";
  if (normalized.includes("deliver")) return "delivered";
  if (normalized === "sent" || normalized.includes("success")) return "sent";
  if (normalized.includes("fail") || normalized.includes("reject") || normalized.includes("error")) return "failed";
  if (normalized.includes("queue") || normalized.includes("pending") || normalized.includes("process")) return "queued";
  return undefined;
}

export async function refreshWhatsAppMessageStatus(messageId: string): Promise<WhatsAppMessage> {
  const db = readDb();
  const message = db.whatsappMessages.find((item) => item.id === messageId);
  if (!message) throw new Error("Pesan WhatsApp tidak ditemukan.");
  if (message.provider !== "starsender") throw new Error("Status provider ini tidak perlu diperiksa ke Starsender.");
  if (!message.externalId) throw new Error("Pesan ini tidak memiliki Starsender message ID.");

  const apiKey = db.whatsappSettings.starsenderAccountApiKey || process.env.STARSENDER_ACCOUNT_API_KEY;
  if (!apiKey) {
    throw new Error("Starsender Account API Key belum diisi. Device API Key hanya dapat mengirim pesan, bukan memeriksa delivery.");
  }

  const baseUrl = db.whatsappSettings.starsenderBaseUrl || process.env.STARSENDER_BASE_URL || "https://api.starsender.online/api";
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/messages/${message.externalId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey
      },
      signal: AbortSignal.timeout(15000)
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new WhatsAppProviderError(
      timedOut
        ? "Pemeriksaan status Starsender timeout setelah 15 detik."
        : "Tidak dapat terhubung ke Starsender untuk memeriksa status."
    );
  }
  const responseText = await response.text();
  let raw: any;
  try {
    raw = responseText ? JSON.parse(responseText) : {};
  } catch {
    raw = { text: responseText };
  }
  if (!response.ok || raw?.success === false) {
    throw new WhatsAppProviderError(
      raw?.message ?? `Gagal memeriksa status Starsender (${response.status}).`,
      raw
    );
  }

  const data = raw?.data ?? {};
  const providerStatus = firstString(data.status, data.message_status, data.delivery_status, raw?.status);
  const nextStatus = mapStarsenderStatus(providerStatus) ?? message.status;
  const checkedAt = new Date().toISOString();
  let updated = message;
  updateDb((nextDb) => {
    const target = nextDb.whatsappMessages.find((item) => item.id === messageId);
    if (!target) return;
    target.status = nextStatus;
    target.statusCheckedAt = checkedAt;
    target.statusMessage = providerStatus
      ? `Status Starsender: ${providerStatus}.`
      : raw?.message ?? "Status diperiksa, tetapi provider belum memberi detail delivery.";
    target.error = nextStatus === "failed" ? target.statusMessage : undefined;
    target.raw = { send: target.raw, statusCheck: raw };
    updated = target;
  });
  return updated;
}

export function recordInboundWhatsApp(input: {
  accountId?: string;
  from: string;
  body: string;
  name?: string;
  provider?: WhatsAppSettings["provider"];
  raw?: unknown;
}): WhatsAppMessage {
  const signal = classifyWaText(input.body);
  const createdAt = new Date().toISOString();
  const phone = normalizeWaNumber(input.from);
  const matchedAccount = input.accountId
    ? readDb().accounts.find((account) => account.id === input.accountId)
    : findAccountByPhone(phone);
  const message: WhatsAppMessage = {
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    accountId: matchedAccount?.id,
    contactPhone: phone,
    to: "crm",
    from: phone,
    body: input.body,
    direction: "inbound",
    status: "delivered",
    provider: input.provider ?? readDb().whatsappSettings.provider,
    signal,
    raw: input.raw,
    createdAt
  };

  updateDb((db) => {
    db.whatsappMessages.unshift(message);
    const account = matchedAccount ? db.accounts.find((item) => item.id === matchedAccount.id) : undefined;
    if (account) {
      account.stage = stageFromSignal(signal, account.stage);
      account.nextAction = signal === "meeting"
        ? "Konfirmasi jadwal meeting dan siapkan brief kebutuhan website."
        : signal === "ask_price" || signal === "hot"
          ? "Kirim range harga dan arahkan ke kebutuhan paket website."
          : signal === "rejected" || signal === "not_valid"
            ? "Stop follow-up untuk prospek ini."
            : "Follow up ringan dengan konteks kebutuhan website.";
      account.updatedAt = createdAt;
    }
  });
  upsertContact({
    phone,
    name: input.name || matchedAccount?.name,
    accountId: matchedAccount?.id,
    signal,
    inbound: true,
    createdAt
  });

  return message;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

export function recordStarsenderWebhook(payload: unknown): WhatsAppMessage {
  const data = payload as Record<string, any>;
  const nested = typeof data.data === "object" && data.data ? data.data as Record<string, any> : {};
  const from = firstString(data.from, data.sender, data.phone, data.number, data.remoteJid, nested.from, nested.sender, nested.phone, nested.number, nested.remoteJid);
  const body = firstString(data.body, data.message, data.text, data.caption, nested.body, nested.message, nested.text, nested.caption);
  const name = firstString(data.name, data.pushName, data.senderName, nested.name, nested.pushName, nested.senderName);

  if (!from || !body) {
    throw new Error("Payload webhook Starsender tidak memiliki nomor atau isi pesan.");
  }

  return recordInboundWhatsApp({
    from,
    body,
    name,
    provider: "starsender",
    raw: payload
  });
}

export function screenWhatsAppContact(input: {
  phone: string;
  classification: WhatsAppLeadSignal;
  status?: WhatsAppContact["status"];
  notes?: string;
  accountId?: string;
}): WhatsAppContact | undefined {
  const phone = normalizeWaNumber(input.phone);
  let updated: WhatsAppContact | undefined;
  updateDb((db) => {
    const contact = db.whatsappContacts.find((item) => item.phone === phone);
    if (!contact) return;
    contact.classification = input.classification;
    contact.status = input.status ?? (input.accountId ? "linked" : "screened");
    contact.notes = input.notes;
    contact.accountId = input.accountId || contact.accountId;
    contact.unreadCount = 0;
    contact.updatedAt = new Date().toISOString();
    updated = contact;

    if (contact.accountId) {
      const account = db.accounts.find((item) => item.id === contact.accountId);
      if (account) {
        account.stage = stageFromSignal(input.classification, account.stage);
        account.nextAction = input.classification === "meeting"
          ? "Konfirmasi jadwal meeting dari inbox WhatsApp."
          : input.classification === "ask_price" || input.classification === "hot"
            ? "Follow up harga/paket dari inbox WhatsApp."
            : input.classification === "rejected" || input.classification === "not_valid"
              ? "Stop follow-up dari hasil screening WhatsApp."
              : account.nextAction;
        account.updatedAt = contact.updatedAt;
      }
    }
  });
  return updated;
}

export function createLeadFromWhatsAppContact(input: {
  phone: string;
  name: string;
  type?: AccountType;
  industry?: string;
  location?: string;
  offerMatch?: string[];
  owner?: ProspectOwner;
  notes?: string;
}): { contact: WhatsAppContact; account: Account } | undefined {
  const phone = normalizeWaNumber(input.phone);
  const now = new Date().toISOString();
  let result: { contact: WhatsAppContact; account: Account } | undefined;
  updateDb((db) => {
    const contact = db.whatsappContacts.find((item) => item.phone === phone);
    if (!contact) return;
    const existing = contact.accountId
      ? db.accounts.find((account) => account.id === contact.accountId)
      : db.accounts.find((account) => accountMatchesPhone(account, phone));
    if (existing) {
      contact.accountId = existing.id;
      contact.status = "linked";
      contact.updatedAt = now;
      result = { contact, account: existing };
      return;
    }

    const account: Account = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      type: input.type ?? "B2B",
      industry: input.industry || "Belum diklasifikasi",
      location: input.location || "Indonesia",
      phone,
      audienceSize: 0,
      budgetClass: "Menengah",
      decisionMaker: contact.name || "Belum diketahui",
      problemHypothesis: "Masuk dari WhatsApp Inbox. Perlu screening kebutuhan website dan budget.",
      offerMatch: input.offerMatch?.length ? input.offerMatch : ["Website Company Profile"],
      priorityScore: contact.classification === "hot" || contact.classification === "ask_price" ? 75 : 55,
      dealValue: 3500000,
      stage: contact.classification === "meeting" ? "Meeting" : contact.classification === "rejected" || contact.classification === "not_valid" ? "Ditolak" : "Chat Admin",
      owner: input.owner ?? "Daus",
      source: "WhatsApp Inbox",
      notes: input.notes || contact.notes,
      nextAction: "Lanjutkan percakapan dari WA Inbox dan validasi kebutuhan.",
      createdAt: now,
      updatedAt: now
    };
    db.accounts.unshift(account);
    db.opportunities.unshift({
      id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      accountId: account.id,
      offerId: "offer-website-company-profile",
      stage: account.stage,
      dealValue: account.dealValue,
      probability: Math.max(20, Math.min(80, account.priorityScore - 10)),
      expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
      source: "WhatsApp Inbox",
      owner: account.owner,
      nextAction: account.nextAction ?? ""
    });
    contact.accountId = account.id;
    contact.name = contact.name || input.name;
    contact.status = "linked";
    contact.updatedAt = now;
    db.whatsappMessages = db.whatsappMessages.map((message) =>
      message.contactPhone === phone ? { ...message, accountId: account.id } : message
    );
    result = { contact, account };
  });
  return result;
}

export function scheduleWhatsAppFollowUp(input: {
  contactPhone: string;
  accountId?: string;
  templateId?: string;
  title: string;
  body: string;
  dueAt: string;
}): WhatsAppFollowUpTask {
  const now = new Date().toISOString();
  const task: WhatsAppFollowUpTask = {
    id: `wafu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contactPhone: normalizeWaNumber(input.contactPhone),
    accountId: input.accountId,
    templateId: input.templateId,
    title: input.title,
    body: input.body,
    status: "pending",
    dueAt: input.dueAt,
    createdAt: now
  };
  updateDb((db) => {
    db.whatsappFollowUps.unshift(task);
  });
  return task;
}

export async function sendWhatsAppFollowUp(taskId: string): Promise<WhatsAppFollowUpTask | undefined> {
  const task = readDb().whatsappFollowUps.find((item) => item.id === taskId);
  if (!task || task.status !== "pending") return task;
  const sent = await sendWhatsAppToContact({
    contactPhone: task.contactPhone,
    accountId: task.accountId,
    body: task.body,
    signal: "warm"
  });
  let updated: WhatsAppFollowUpTask | undefined;
  updateDb((db) => {
    const nextTask = db.whatsappFollowUps.find((item) => item.id === taskId);
    if (!nextTask) return;
    nextTask.status = sent.status === "failed" ? "failed" : sent.status === "queued" ? "queued" : "sent";
    nextTask.sentMessageId = sent.id;
    nextTask.error = sent.error;
    nextTask.updatedAt = new Date().toISOString();
    updated = nextTask;
  });
  return updated;
}
