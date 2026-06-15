import React, { useEffect, useMemo, useState } from "react";
import { Link2, MessageCircle, RefreshCw, Save, ShieldCheck } from "lucide-react";
import type { Account, WhatsAppContact, WhatsAppLeadSignal, WhatsAppMessage } from "../../shared/types";

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
    void loadInbox();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;
    setClassification(selectedContact.classification);
    setAccountId(selectedContact.accountId ?? "");
    setNotes(selectedContact.notes ?? "");
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
                  <span>{selectedContact.status} · terakhir {formatTime(selectedContact.lastMessageAt)}</span>
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
                      <span>{message.signal} · {formatTime(message.createdAt)}</span>
                    </div>
                    <p>{message.body}</p>
                    {message.error && <small>{message.error}</small>}
                  </div>
                ))}
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
                <button className="primaryBtn" type="button" onClick={saveScreening} disabled={busy}>
                  <Save size={14} /> Simpan Screening
                </button>
              </div>
            </>
          ) : (
            <div className="waInboxEmpty">Pilih kontak untuk melihat chat dan screening.</div>
          )}
        </main>
      </div>
    </section>
  );
}
