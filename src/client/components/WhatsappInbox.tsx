import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, CheckCheck, Clock3, Link2, MessageCircle, Plus, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import type { Account, WhatsAppContact, WhatsAppFollowUpTask, WhatsAppLeadSignal, WhatsAppMessage, WhatsAppTemplate } from "../../shared/types";

interface InboxContact extends WhatsAppContact {
  account?: Account;
  lastMessage?: WhatsAppMessage;
}

interface WhatsappInboxProps {
  accounts: Account[];
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onOpenAccount: (account: Account) => void;
  onDataChanged: () => Promise<void>;
}

const classifications: Array<{ value: WhatsAppLeadSignal; label: string }> = [
  { value: "unknown", label: "Belum Jelas" },
  { value: "cold", label: "Cold" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "ask_price", label: "Tanya Harga" },
  { value: "meeting", label: "Meeting" },
  { value: "rejected", label: "Ditolak" },
  { value: "not_valid", label: "Nomor Tidak Valid" }
];

function formatTime(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function deliveryLabel(message: WhatsAppMessage) {
  if (message.status === "queued") return "Diterima gateway";
  if (message.status === "sent") return "Terkirim";
  if (message.status === "delivered") return "Sampai";
  if (message.status === "read") return "Dibaca";
  if (message.status === "failed") return "Gagal";
  return message.status;
}

export default function WhatsappInbox({
  accounts,
  apiFetch,
  onOpenAccount,
  onDataChanged
}: WhatsappInboxProps) {
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [classification, setClassification] = useState<WhatsAppLeadSignal>("unknown");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [followUps, setFollowUps] = useState<Array<WhatsAppFollowUpTask & { account?: Account; contact?: WhatsAppContact }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [replyText, setReplyText] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadIndustry, setLeadIndustry] = useState("");
  const [leadLocation, setLeadLocation] = useState("Indonesia");
  const [followUpTitle, setFollowUpTitle] = useState("Follow up WhatsApp");
  const [followUpAt, setFollowUpAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.phone === selectedPhone),
    [contacts, selectedPhone]
  );

  async function loadInbox(preferredPhone = selectedPhone) {
    const response = await apiFetch("/api/whatsapp/inbox");
    if (!response.ok) return;
    const payload = await response.json();
    const nextContacts = payload.contacts ?? [];
    setContacts(nextContacts);
    const phone = preferredPhone || nextContacts[0]?.phone || "";
    setSelectedPhone(phone);
    if (phone) {
      const messagesRes = await apiFetch(`/api/whatsapp/messages/by-phone/${phone}`);
      if (messagesRes.ok) setMessages(await messagesRes.json());
    } else {
      setMessages([]);
    }
  }

  useEffect(() => {
    async function loadBase() {
      await loadInbox();
      const [templatesRes, followUpsRes] = await Promise.all([
        apiFetch("/api/whatsapp/templates"),
        apiFetch("/api/whatsapp/follow-ups")
      ]);
      if (templatesRes.ok) setTemplates(await templatesRes.json());
      if (followUpsRes.ok) setFollowUps(await followUpsRes.json());
    }
    void loadBase();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    setClassification(selectedContact.classification);
    setAccountId(selectedContact.accountId ?? "");
    setNotes(selectedContact.notes ?? "");
    setLeadName(selectedContact.account?.name || selectedContact.name || "");
    setLeadIndustry(selectedContact.account?.industry || "");
    setLeadLocation(selectedContact.account?.location || "Indonesia");
  }, [selectedContact?.phone]);

  async function selectContact(phone: string) {
    setSelectedPhone(phone);
    const messagesRes = await apiFetch(`/api/whatsapp/messages/by-phone/${phone}`);
    if (messagesRes.ok) setMessages(await messagesRes.json());
  }

  async function refreshInbox() {
    setBusy(true);
    try {
      await apiFetch("/api/whatsapp/inbox/refresh", { method: "POST" });
      await loadInbox();
      setStatus("Chat terbaru sudah dimuat dari database webhook lokal.");
      setTimeout(() => setStatus(""), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function saveScreening() {
    if (!selectedContact) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/contacts/${selectedContact.phone}/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classification,
          status: accountId ? "linked" : "screened",
          accountId: accountId || undefined,
          notes
        })
      });
      if (!response.ok) throw new Error("Gagal menyimpan screening kontak.");
      await loadInbox(selectedContact.phone);
      await onDataChanged();
      setStatus("Screening kontak tersimpan.");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyimpan screening kontak.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadFollowUps() {
    const followUpsRes = await apiFetch("/api/whatsapp/follow-ups");
    if (followUpsRes.ok) setFollowUps(await followUpsRes.json());
  }

  async function applyTemplate(templateId: string) {
    if (!selectedContact) return;
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const response = await apiFetch("/api/whatsapp/render-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId, phone: selectedContact.phone, accountId: accountId || selectedContact.accountId })
    });
    if (response.ok) {
      const payload = await response.json();
      setReplyText(payload.body ?? "");
    }
  }

  async function sendReply() {
    if (!selectedContact || !replyText.trim()) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/send-contact/${selectedContact.phone}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyText,
          accountId: accountId || selectedContact.accountId,
          contactName: selectedContact.name || selectedContact.account?.name
        })
      });
      const payload = await response.json();
      await selectContact(selectedContact.phone);
      await loadInbox(selectedContact.phone);
      await onDataChanged();
      setReplyText("");
      if (!response.ok || payload.status === "failed") {
        setStatus(payload.error ?? "Gagal mengirim balasan.");
      } else if (payload.status === "queued") {
        setStatus(`Pesan diterima Starsender${payload.externalId ? ` (ID ${payload.externalId})` : ""}, tetapi delivery ke WhatsApp belum terkonfirmasi.`);
      } else {
        setStatus("Balasan WhatsApp terkirim.");
      }
      setTimeout(() => setStatus(""), 6000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal mengirim balasan.");
    } finally {
      setBusy(false);
    }
  }

  async function checkDelivery(message: WhatsAppMessage) {
    setBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/messages/${message.id}/status`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Gagal memeriksa delivery.");
      await selectContact(selectedPhone);
      setStatus(payload.statusMessage ?? `Status pesan: ${deliveryLabel(payload)}.`);
      setTimeout(() => setStatus(""), 6000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal memeriksa delivery.");
    } finally {
      setBusy(false);
    }
  }

  async function createLead() {
    if (!selectedContact || !leadName.trim()) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/contacts/${selectedContact.phone}/create-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          industry: leadIndustry || "Belum diklasifikasi",
          location: leadLocation || "Indonesia",
          offerMatch: ["Website Company Profile"],
          notes
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Gagal membuat lead dari kontak WA.");
      await loadInbox(selectedContact.phone);
      await onDataChanged();
      setAccountId(payload.account.id);
      setStatus("Lead baru berhasil dibuat dari kontak WhatsApp.");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal membuat lead dari kontak WA.");
    } finally {
      setBusy(false);
    }
  }

  async function scheduleFollowUp() {
    if (!selectedContact || !replyText.trim() || !followUpAt) return;
    setBusy(true);
    try {
      const response = await apiFetch("/api/whatsapp/follow-ups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPhone: selectedContact.phone,
          accountId: accountId || selectedContact.accountId,
          templateId: selectedTemplateId || undefined,
          title: followUpTitle,
          body: replyText,
          dueAt: new Date(followUpAt).toISOString()
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Gagal menjadwalkan follow-up.");
      await reloadFollowUps();
      setStatus("Follow-up masuk queue.");
      setTimeout(() => setStatus(""), 3000);
    } finally {
      setBusy(false);
    }
  }

  async function sendFollowUp(taskId: string) {
    setBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/follow-ups/${taskId}/send`, { method: "POST" });
      const payload = await response.json();
      await reloadFollowUps();
      if (selectedPhone) await selectContact(selectedPhone);
      setStatus(
        !response.ok
          ? payload.error ?? "Follow-up gagal dikirim."
          : payload.status === "queued"
            ? "Follow-up diterima gateway Starsender, delivery belum terkonfirmasi."
            : "Follow-up terkirim."
      );
      setTimeout(() => setStatus(""), 6000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="waInboxPage">
      <header className="waInboxTopbar">
        <div>
          <h2><MessageCircle size={18} /> WA Inbox</h2>
          <p>Chat terbaru dari webhook Starsender, lalu screening kontak sebelum masuk pipeline.</p>
        </div>
        <button className="primaryBtn" type="button" onClick={refreshInbox} disabled={busy}>
          <RefreshCw size={14} /> Ambil Chat Terbaru
        </button>
      </header>

      {status && <div className="operationAlert">{status}</div>}

      <div className="waInboxLayout">
        <aside className="waContactList">
          {contacts.map((contact) => (
            <button
              key={contact.phone}
              type="button"
              className={contact.phone === selectedPhone ? "active" : ""}
              onClick={() => selectContact(contact.phone)}
            >
              <div>
                <strong>{contact.name || contact.account?.name || contact.phone}</strong>
                <span>{contact.phone}</span>
              </div>
              <em>{contact.classification}</em>
              <p>{contact.lastMessage?.body ?? "Belum ada preview pesan."}</p>
            </button>
          ))}
          {contacts.length === 0 && (
            <div className="waInboxEmpty">
              Belum ada chat. Pasang webhook Starsender ke <code>/api/whatsapp/webhook/starsender</code>.
            </div>
          )}
        </aside>

        <main className="waConversationPane">
          {selectedContact ? (
            <>
              <div className="waConversationHeader">
                <div>
                  <h3>{selectedContact.name || selectedContact.account?.name || selectedContact.phone}</h3>
                  <span>{selectedContact.status} - terakhir {formatTime(selectedContact.lastMessageAt)}</span>
                </div>
                {selectedContact.account && (
                  <button className="ghostBtn" type="button" onClick={() => onOpenAccount(selectedContact.account!)}>
                    <Link2 size={13} /> Buka Lead
                  </button>
                )}
              </div>

              <div className="waConversationMessages">
                {messages.map((message) => (
                  <div key={message.id} className={`waBubble ${message.direction}`}>
                    <div>
                      <strong>{message.direction === "outbound" ? "Daus" : selectedContact.name || selectedContact.phone}</strong>
                      <span>{formatTime(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                    <div className="waDeliveryRow">
                      <span className={`waDeliveryStatus ${message.status}`}>
                        {message.status === "failed" ? <AlertCircle size={12} /> : message.status === "queued" ? <Clock3 size={12} /> : <CheckCheck size={12} />}
                        {message.direction === "inbound" ? message.signal : deliveryLabel(message)}
                      </span>
                      {message.externalId && <span>ID {message.externalId}</span>}
                      {message.direction === "outbound" && message.provider === "starsender" && message.externalId && (
                        <button type="button" title="Cek status delivery" onClick={() => checkDelivery(message)} disabled={busy}>
                          <RefreshCw size={12} />
                        </button>
                      )}
                    </div>
                    {message.statusMessage && <small className="waStatusMessage">{message.statusMessage}</small>}
                    {message.error && <small className="waErrorMessage">{message.error}</small>}
                  </div>
                ))}
              </div>

              <div className="waReplyPanel">
                <h3><Send size={15} /> Reply Center</h3>
                <div className="waScreeningGrid">
                  <label>
                    Template Pesan
                    <select value={selectedTemplateId} onChange={(event) => applyTemplate(event.target.value)}>
                      <option value="">Tulis manual</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Jadwal Follow-up
                    <input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
                  </label>
                  <label className="wideField">
                    Pesan
                    <textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Tulis balasan WhatsApp atau pilih template..." />
                  </label>
                </div>
                <div className="waInlineActions">
                  <button className="primaryBtn" type="button" onClick={sendReply} disabled={busy || !replyText.trim()}>
                    <Send size={14} /> Kirim Sekarang
                  </button>
                  <button className="ghostBtn" type="button" onClick={scheduleFollowUp} disabled={busy || !replyText.trim() || !followUpAt}>
                    <CalendarClock size={14} /> Jadwalkan
                  </button>
                </div>
              </div>

              <div className="waScreeningPanel">
                <h3><ShieldCheck size={15} /> Screening Kontak</h3>
                <div className="waScreeningGrid">
                  <label>
                    Klasifikasi
                    <select value={classification} onChange={(event) => setClassification(event.target.value as WhatsAppLeadSignal)}>
                      {classifications.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>
                    Hubungkan ke Lead
                    <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                      <option value="">Belum dihubungkan</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.name} - {account.phone || account.ownerPhone || "no phone"}</option>
                      ))}
                    </select>
                  </label>
                  <label className="wideField">
                    Catatan Screening
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: tanya harga, cocok dikirim paket company profile..." />
                  </label>
                </div>
                {!selectedContact.accountId && (
                  <div className="waLeadCreator">
                    <h3><Plus size={15} /> Buat Lead dari Kontak Ini</h3>
                    <div className="waScreeningGrid">
                      <label>
                        Nama Lead
                        <input value={leadName} onChange={(event) => setLeadName(event.target.value)} placeholder="Nama bisnis / kontak" />
                      </label>
                      <label>
                        Industri
                        <input value={leadIndustry} onChange={(event) => setLeadIndustry(event.target.value)} placeholder="Contoh: klinik gigi" />
                      </label>
                      <label>
                        Lokasi
                        <input value={leadLocation} onChange={(event) => setLeadLocation(event.target.value)} placeholder="Jakarta" />
                      </label>
                    </div>
                  </div>
                )}
                <div className="waInlineActions">
                  <button className="primaryBtn" type="button" onClick={saveScreening} disabled={busy}>
                    <Save size={14} /> Simpan Screening
                  </button>
                  {!selectedContact.accountId && (
                    <button className="ghostBtn" type="button" onClick={createLead} disabled={busy || !leadName.trim()}>
                      <Plus size={14} /> Buat Lead
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="waInboxEmpty">Pilih kontak untuk melihat chat dan screening.</div>
          )}
        </main>
      </div>

      <aside className="waFollowUpDrawer">
        <h3><CalendarClock size={15} /> Follow-up Queue</h3>
        {followUps.filter((task) => task.status === "pending").slice(0, 6).map((task) => (
          <div className="waFollowUpItem" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.account?.name || task.contact?.name || task.contactPhone} - {formatTime(task.dueAt)}</span>
            </div>
            <p>{task.body}</p>
            <button className="ghostBtn" type="button" disabled={busy} onClick={() => sendFollowUp(task.id)}>
              <Send size={13} /> Kirim
            </button>
          </div>
        ))}
        {followUps.filter((task) => task.status === "pending").length === 0 && (
          <p>Belum ada follow-up pending.</p>
        )}
      </aside>
    </section>
  );
}
