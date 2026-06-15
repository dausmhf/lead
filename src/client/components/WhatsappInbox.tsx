import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bold, CalendarClock, CheckCheck, Clock3, Italic, Link2, MessageCircle, Plus, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
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

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarBg(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899"];
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

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

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}j ${minutes}m ${seconds}d`;
  if (minutes > 0) return `${minutes}m ${seconds}d`;
  return `${seconds} detik`;
}

function normalizePhone(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

const whatsappTargetStorageKey = "lead-website.whatsappTarget";

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
  const [clockNow, setClockNow] = useState(() => Date.now());
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // New visual state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeClassificationFilter, setActiveClassificationFilter] = useState("all");
  const [showScreeningSidebar, setShowScreeningSidebar] = useState(
    () => typeof window === "undefined" || window.innerWidth > 1360
  );

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.phone === selectedPhone),
    [contacts, selectedPhone]
  );

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const contactName = contact.name || contact.account?.name || contact.phone || "";
      const matchesSearch = contactName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClassification = activeClassificationFilter === "all" || contact.classification === activeClassificationFilter;
      return matchesSearch && matchesClassification;
    });
  }, [contacts, searchTerm, activeClassificationFilter]);

  const pendingFollowUpsCount = useMemo(() => {
    return followUps.filter((task) => task.status === "pending").length;
  }, [followUps]);

  const responseTimer = useMemo(() => {
    const selectedNumber = normalizePhone(selectedContact?.phone);
    const brandNumber = normalizePhone(selectedContact?.account?.phone);
    const ownerNumber = normalizePhone(selectedContact?.account?.ownerPhone);
    const isOwnerContact = Boolean(ownerNumber && selectedNumber === ownerNumber && selectedNumber !== brandNumber);
    if (isOwnerContact) {
      return { state: "idle" as const, label: "Kontak owner tidak diaudit" };
    }

    const timeline = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let lastOutboundIndex = -1;
    for (let index = timeline.length - 1; index >= 0; index -= 1) {
      if (timeline[index].direction === "outbound" && timeline[index].status !== "failed") {
        lastOutboundIndex = index;
        break;
      }
    }

    if (lastOutboundIndex < 0) {
      return { state: "idle" as const, label: "Belum diaudit" };
    }

    const outbound = timeline[lastOutboundIndex];
    const reply = timeline.slice(lastOutboundIndex + 1).find((message) => message.direction === "inbound");
    const outboundTime = new Date(outbound.createdAt).getTime();

    if (reply) {
      const duration = new Date(reply.createdAt).getTime() - outboundTime;
      return { state: "answered" as const, label: `Dibalas ${formatDuration(duration)}` };
    }

    return { state: "waiting" as const, label: `Menunggu ${formatDuration(clockNow - outboundTime)}` };
  }, [messages, clockNow, selectedContact]);

  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadInbox(preferredPhone = selectedPhone) {
    const response = await apiFetch("/api/whatsapp/inbox");
    if (!response.ok) return;
    const payload = await response.json();
    const nextContacts = payload.contacts ?? [];
    setContacts(nextContacts);
    const normalizedPreferredPhone = normalizePhone(preferredPhone);
    const matchingContact = nextContacts.find(
      (contact: InboxContact) => normalizePhone(contact.phone) === normalizedPreferredPhone
    );
    const phone = matchingContact?.phone || preferredPhone || nextContacts[0]?.phone || "";
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
      const preferredPhone = window.sessionStorage.getItem(whatsappTargetStorageKey) || "";
      window.sessionStorage.removeItem(whatsappTargetStorageKey);
      await loadInbox(preferredPhone);
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

  function formatReply(prefix: string, suffix = prefix) {
    const input = replyInputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = replyText.slice(start, end);
    const replacement = `${prefix}${selected || "teks"}${suffix}`;
    setReplyText(`${replyText.slice(0, start)}${replacement}${replyText.slice(end)}`);
    requestAnimationFrame(() => {
      input.focus();
      const selectionStart = start + prefix.length;
      input.setSelectionRange(selectionStart, selectionStart + (selected || "teks").length);
    });
  }

  return (
    <section className="waInboxPage">
      {status && <div className="operationAlert">{status}</div>}

      <div className={`waInboxContainer ${selectedContact ? "hasSelection" : ""}`}>
        {/* Column 1: Navigation Sidebar */}
        <aside className="waNavSidebar">
          <div className="waNavHeader">
            <MessageCircle size={20} color="#009b77" />
            <h2>WA Inbox</h2>
          </div>

          <button
            className="composeBtn"
            type="button"
            onClick={refreshInbox}
            disabled={busy}
          >
            <RefreshCw size={14} /> Ambil Chat Terbaru
          </button>

          <nav className="waNavMenu">
            <button
              className={activeClassificationFilter === "all" ? "active" : ""}
              type="button"
              onClick={() => setActiveClassificationFilter("all")}
            >
              <span>Inbox</span>
              <span className="countBadge">{contacts.length}</span>
            </button>
            <button
              className="inactive"
              type="button"
              style={{ cursor: "default" }}
            >
              <span>Follow-up Pending</span>
              <span className="countBadge" style={{ background: "#fee2e2", color: "#ef4444" }}>
                {pendingFollowUpsCount}
              </span>
            </button>
          </nav>

          <div className="waLabelSection">
            <div className="waLabelHeader">
              <span>KLASIFIKASI FILTER</span>
              {activeClassificationFilter !== "all" && (
                <button
                  onClick={() => setActiveClassificationFilter("all")}
                  style={{ border: 0, background: "transparent", color: "#ef4444", fontSize: "9px", cursor: "pointer", fontWeight: "700" }}
                >
                  RESET
                </button>
              )}
            </div>
            <div className="waLabelList">
              {classifications.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`waLabelItem ${activeClassificationFilter === item.value ? "active" : ""}`}
                  onClick={() => setActiveClassificationFilter(item.value)}
                >
                  <span className={`waLabelDot ${item.value}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Column 2: Contacts Panel */}
        <div className="waMiddlePanel">
          <div className="waSearchWrapper">
            <input
              type="text"
              placeholder="Cari kontak WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="waMobileRefreshBtn" type="button" title="Ambil chat terbaru" onClick={refreshInbox} disabled={busy}>
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="waContactList">
            {filteredContacts.map((contact) => {
              const displayName = contact.name || contact.account?.name || contact.phone;
              return (
                <button
                  key={contact.phone}
                  type="button"
                  className={`waContactItem ${contact.phone === selectedPhone ? "active" : ""}`}
                  onClick={() => selectContact(contact.phone)}
                >
                  <div
                    className="waAvatar"
                    style={{ background: getAvatarBg(displayName) }}
                  >
                    {getInitials(displayName)}
                  </div>
                  <div className="waContactMeta">
                    <div className="waContactHeader">
                      <strong>{displayName}</strong>
                      <span>{contact.lastMessageAt ? new Date(contact.lastMessageAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    <p>{contact.lastMessage?.body ?? "Belum ada preview pesan."}</p>
                    <div className="waContactBadgeLine">
                      <span className={`waContactBadge ${contact.classification}`}>
                        {classifications.find((c) => c.value === contact.classification)?.label || contact.classification}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredContacts.length === 0 && (
              <div className="waInboxEmptyState">
                <AlertCircle size={24} color="#94a3b8" />
                <p>Tidak ada kontak ditemukan</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Conversation & Screening */}
        <div className="waRightConversationPanel">
          {selectedContact ? (
            <main className="waChatArea">
              <div className="waChatHeader">
                <div>
                  <button className="waMobileBackBtn" type="button" title="Kembali ke daftar kontak" onClick={() => setSelectedPhone("")}>
                    <ArrowLeft size={16} />
                  </button>
                  <h3>{selectedContact.name || selectedContact.account?.name || selectedContact.phone}</h3>
                  <p>{selectedContact.phone} — {selectedContact.status || "Aktif"} (Terakhir {formatTime(selectedContact.lastMessageAt)})</p>
                </div>
                <div className="waChatHeaderActions">
                  <div className={`waResponseTimer ${responseTimer.state}`} title="Audit dihitung dari pesan keluar terakhir ke balasan pertama admin brand">
                    <Clock3 size={14} />
                    <div>
                      <span>Audit admin brand</span>
                      <strong>{responseTimer.label}</strong>
                    </div>
                  </div>
                  {selectedContact.account && (
                    <button
                      className="ghostBtn"
                      type="button"
                      onClick={() => onOpenAccount(selectedContact.account!)}
                      style={{ fontSize: "12px", height: "32px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <Link2 size={13} /> Buka Lead
                    </button>
                  )}
                  <button
                    className="ghostBtn"
                    type="button"
                    onClick={() => setShowScreeningSidebar(!showScreeningSidebar)}
                    style={{
                      fontSize: "12px",
                      height: "32px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      borderColor: showScreeningSidebar ? "#009b77" : "",
                      color: showScreeningSidebar ? "#009b77" : ""
                    }}
                  >
                    <ShieldCheck size={13} /> Screening
                  </button>
                </div>
              </div>

              <div className="waChatMessages">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`waMessageBubble ${message.direction}`}
                  >
                    <div className="waMessageHeader">
                      <strong style={{ color: message.direction === "outbound" ? "#065f46" : "#334155" }}>
                        {message.direction === "outbound" ? "Daus" : selectedContact.name || selectedContact.phone}
                      </strong>
                      <span>{new Date(message.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="waMessageBody">{message.body}</p>
                    <div className="waMessageFooter">
                      <span className={`waDeliveryStatus ${message.status}`}>
                        {message.direction === "inbound" ? (
                          <span style={{ fontSize: "9px", background: "#e2e8f0", color: "#475569", padding: "1px 5px", borderRadius: "4px" }}>
                            {message.signal}
                          </span>
                        ) : (
                          <>
                            {message.status === "failed" ? <AlertCircle size={10} /> : message.status === "queued" ? <Clock3 size={10} /> : <CheckCheck size={10} />}
                            <span style={{ fontSize: "9px" }}>{deliveryLabel(message)}</span>
                          </>
                        )}
                      </span>
                      {message.externalId && <span style={{ fontSize: "9px", color: "#94a3b8" }}>ID: {message.externalId}</span>}
                      {message.direction === "outbound" && message.provider === "starsender" && message.externalId && (
                        <button
                          type="button"
                          title="Cek status delivery"
                          onClick={() => checkDelivery(message)}
                          disabled={busy}
                          style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", display: "grid", placeItems: "center", color: "#94a3b8" }}
                        >
                          <RefreshCw size={10} />
                        </button>
                      )}
                    </div>
                    {message.statusMessage && <small style={{ fontSize: "9px", color: "#d97706", display: "block" }}>{message.statusMessage}</small>}
                    {message.error && <small style={{ fontSize: "9px", color: "#ef4444", display: "block" }}>{message.error}</small>}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="waInboxEmptyState">
                    <MessageCircle size={36} color="#cbd5e1" />
                    <p>Belum ada riwayat percakapan.</p>
                  </div>
                )}
              </div>

              {/* Composer Box */}
              <div className="waComposerBox">
                <textarea
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Tulis balasan WhatsApp atau pilih template di bawah..."
                />
                <div className="waComposerActions">
                  <div className="waComposerFormatting">
                    <button type="button" title="Tebal" onClick={() => formatReply("*")}><Bold size={14} /></button>
                    <button type="button" title="Miring" onClick={() => formatReply("_")}><Italic size={14} /></button>

                    <span style={{ margin: "0 4px", borderRight: "1px solid #e2e8f0", height: "16px" }} />

                    {/* Template Dropdown */}
                    <select
                      value={selectedTemplateId}
                      onChange={(event) => applyTemplate(event.target.value)}
                      style={{
                        border: "1px solid #e2e8f0",
                        background: "#ffffff",
                        borderRadius: "6px",
                        height: "26px",
                        padding: "0 6px",
                        fontSize: "12px",
                        color: "#475569"
                      }}
                    >
                      <option value="">Pilih Template Pesan...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    className="waComposerSendBtn"
                    type="button"
                    onClick={sendReply}
                    disabled={busy || !replyText.trim()}
                  >
                    <span>Kirim</span>
                    <Send size={13} />
                  </button>
                </div>
              </div>
            </main>
          ) : (
            <div className="waInboxEmpty">
              <MessageCircle size={48} color="#cbd5e1" style={{ marginBottom: "16px" }} />
              <h3>WhatsApp Inbox</h3>
              <p>Pilih salah satu kontak di kolom sebelah kiri untuk mulai melihat riwayat chat dan melakukan screening prospek.</p>
            </div>
          )}

          {/* Column 4: Screening Sidebar (Collapsible) */}
          {selectedContact && showScreeningSidebar && (
            <aside className="waScreeningSidebar">
              <div className="waScreeningSection">
                <h3><ShieldCheck size={16} color="#009b77" /> Screening Prospek</h3>
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
                  <label>
                    Catatan Screening
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Contoh: tertarik dengan paket promo company profile, minta dihubungi kembali minggu depan..."
                    />
                  </label>
                  <button
                    className="primaryBtn"
                    type="button"
                    onClick={saveScreening}
                    disabled={busy}
                    style={{ width: "100%", height: "36px", marginTop: "4px" }}
                  >
                    <Save size={14} /> Simpan Screening
                  </button>
                </div>
              </div>

              {!selectedContact.accountId && (
                <div className="waScreeningSection">
                  <h3><Plus size={16} color="#2563eb" /> Buat Lead Baru</h3>
                  <div className="waScreeningGrid">
                    <label>
                      Nama Lead
                      <input value={leadName} onChange={(event) => setLeadName(event.target.value)} placeholder="Nama bisnis / kontak" />
                    </label>
                    <label>
                      Industri
                      <input value={leadIndustry} onChange={(event) => setLeadIndustry(event.target.value)} placeholder="Contoh: klinik gigi, manufaktur..." />
                    </label>
                    <label>
                      Lokasi
                      <input value={leadLocation} onChange={(event) => setLeadLocation(event.target.value)} placeholder="Jakarta, Surabaya..." />
                    </label>
                    <button
                      className="ghostBtn"
                      type="button"
                      onClick={createLead}
                      disabled={busy || !leadName.trim()}
                      style={{ width: "100%", height: "36px", marginTop: "4px" }}
                    >
                      <Plus size={14} /> Buat Lead
                    </button>
                  </div>
                </div>
              )}

              <div className="waScreeningSection">
                <h3><CalendarClock size={16} color="#ea580c" /> Jadwal Follow-up</h3>
                <div className="waScreeningGrid">
                  <label>
                    Judul Task
                    <input value={followUpTitle} onChange={(event) => setFollowUpTitle(event.target.value)} placeholder="Judul follow-up..." />
                  </label>
                  <label>
                    Waktu Follow-up
                    <input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} />
                  </label>
                  <button
                    className="ghostBtn"
                    type="button"
                    onClick={scheduleFollowUp}
                    disabled={busy || !replyText.trim() || !followUpAt}
                    style={{ width: "100%", height: "36px", marginTop: "4px" }}
                  >
                    <CalendarClock size={14} /> Antrikan Follow-up
                  </button>
                </div>
              </div>

              {/* Follow-up Queue */}
              <div className="waScreeningSection" style={{ borderBottom: 0 }}>
                <h3>Follow-up Queue</h3>
                <div className="waFollowUpSection">
                  {followUps.filter((task) => task.status === "pending" && task.contactPhone === selectedContact.phone).slice(0, 3).map((task) => (
                    <div className="waFollowUpItem" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <span style={{ fontSize: "9px" }}>{formatTime(task.dueAt)}</span>
                      </div>
                      <p>{task.body}</p>
                      <button
                        className="ghostBtn"
                        type="button"
                        disabled={busy}
                        onClick={() => sendFollowUp(task.id)}
                        style={{ height: "26px", fontSize: "11px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px" }}
                      >
                        <Send size={10} /> Kirim Sekarang
                      </button>
                    </div>
                  ))}
                  {followUps.filter((task) => task.status === "pending" && task.contactPhone === selectedContact.phone).length === 0 && (
                    <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>Belum ada antrean follow-up untuk kontak ini.</p>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
