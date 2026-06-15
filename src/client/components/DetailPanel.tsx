import React, { useState, useEffect } from "react";
import { X, AlertCircle, MessageCircle, Send, RefreshCw, Bot } from "lucide-react";
import type { Account, Offer, PipelineStage, ProspectOwner, WhatsAppMessage } from "../../shared/types";

function productOptions(offers: Offer[]) {
  return [...new Set(["PSH", "Sehat Bercinta", "Media Service KMI", "Media Service Community", ...offers.map((offer) => offer.name)])];
}

const stages: PipelineStage[] = [
  "Belum Dihubungi",
  "Chat Admin",
  "Chat Management",
  "Kirim Proposal",
  "Meeting",
  "Negosiasi",
  "Kirim MOU",
  "Transfer",
  "Closed (WON)",
  "Ditolak"
];


interface DetailPanelProps {
  account: Account;
  offers: Offer[];
  pics: ProspectOwner[];
  onClose: () => void;
  onPatch: (fields: Partial<Account> & { dealValue?: number }) => void;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onAfterWhatsAppSend?: () => void;
}

export default function DetailPanel({
  account,
  offers,
  pics,
  onClose,
  onPatch,
  apiFetch,
  onAfterWhatsAppSend
}: DetailPanelProps) {
  const [industry, setIndustry] = useState(account.industry ?? "");
  const [location, setLocation] = useState(account.location ?? "");
  const [decisionMaker, setDecisionMaker] = useState(account.decisionMaker ?? "");
  const [nextAction, setNextAction] = useState(account.nextAction ?? "");
  const [notes, setNotes] = useState(account.notes ?? "");
  const [phone, setPhone] = useState(account.phone ?? "");
  const [email, setEmail] = useState(account.email ?? "");
  const [website, setWebsite] = useState(account.website ?? "");
  const [instagram, setInstagram] = useState(account.instagram ?? "");
  const [tiktok, setTiktok] = useState(account.tiktok ?? "");
  const [facebook, setFacebook] = useState(account.facebook ?? "");
  const [linkedin, setLinkedin] = useState(account.linkedin ?? "");
  const [googleBusinessProfile, setGoogleBusinessProfile] = useState(account.googleBusinessProfile ?? "");
  const [ownerName, setOwnerName] = useState(account.ownerName ?? "");
  const [ownerInstagram, setOwnerInstagram] = useState(account.ownerInstagram ?? "");
  const [ownerPhone, setOwnerPhone] = useState(account.ownerPhone ?? "");
  const [ownerFacebook, setOwnerFacebook] = useState(account.ownerFacebook ?? "");
  const [ownerLinkedin, setOwnerLinkedin] = useState(account.ownerLinkedin ?? "");
  const [ownerEmail, setOwnerEmail] = useState(account.ownerEmail ?? "");
  const [meetingDate, setMeetingDate] = useState(account.meetingDate ?? "");
  const [dealValue, setDealValue] = useState(0);
  const [operationMsg, setOperationMsg] = useState<string | null>(null);
  const [waTo, setWaTo] = useState("");
  const [waDraft, setWaDraft] = useState("");
  const [waMessages, setWaMessages] = useState<WhatsAppMessage[]>([]);
  const [waBusy, setWaBusy] = useState(false);
  const [inboundText, setInboundText] = useState("");

  useEffect(() => {
    setIndustry(account.industry ?? "");
    setLocation(account.location ?? "");
    setDecisionMaker(account.decisionMaker ?? "");
    setNextAction(account.nextAction ?? "");
    setNotes(account.notes ?? "");
    setPhone(account.phone ?? "");
    setEmail(account.email ?? "");
    setWebsite(account.website ?? "");
    setInstagram(account.instagram ?? "");
    setTiktok(account.tiktok ?? "");
    setFacebook(account.facebook ?? "");
    setLinkedin(account.linkedin ?? "");
    setGoogleBusinessProfile(account.googleBusinessProfile ?? "");
    setOwnerName(account.ownerName ?? "");
    setOwnerInstagram(account.ownerInstagram ?? "");
    setOwnerPhone(account.ownerPhone ?? "");
    setOwnerFacebook(account.ownerFacebook ?? "");
    setOwnerLinkedin(account.ownerLinkedin ?? "");
    setOwnerEmail(account.ownerEmail ?? "");
    setMeetingDate(account.meetingDate ?? "");
    setOperationMsg(null);
    setDealValue(account.dealValue ?? 0);
  }, [account]);

  async function loadWaConversation() {
    try {
      const [draftRes, messagesRes] = await Promise.all([
        apiFetch(`/api/whatsapp/draft/${account.id}`),
        apiFetch(`/api/whatsapp/messages/${account.id}`)
      ]);
      if (draftRes.ok) {
        const payload = await draftRes.json();
        setWaTo(payload.to ?? "");
        setWaDraft(payload.draft ?? "");
      }
      if (messagesRes.ok) {
        setWaMessages(await messagesRes.json());
      }
    } catch (error) {
      console.error("Error loading WhatsApp conversation:", error);
    }
  }

  useEffect(() => {
    loadWaConversation();
  }, [account.id]);

  const handleSaveDetail = () => {
    onPatch({
      industry,
      location,
      decisionMaker,
      nextAction,
      notes,
      phone,
      email,
      website,
      instagram,
      tiktok,
      facebook,
      linkedin,
      googleBusinessProfile,
      ownerName,
      ownerInstagram,
      ownerPhone,
      ownerFacebook,
      ownerLinkedin,
      ownerEmail,
      meetingDate: meetingDate || undefined,
      dealValue
    });
    setOperationMsg("Detail prospek berhasil diperbarui.");
    setTimeout(() => setOperationMsg(null), 3000);
  };

  async function handleSendWhatsApp() {
    setWaBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/send/${account.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: waTo, body: waDraft })
      });
      const payload = await response.json();
      await loadWaConversation();
      await onAfterWhatsAppSend?.();
      if (!response.ok) {
        setOperationMsg(payload.error ?? "WhatsApp gagal dikirim.");
      } else {
        setOperationMsg("Pesan WhatsApp berhasil dikirim dan stage dipindah ke Chat Admin.");
      }
      setTimeout(() => setOperationMsg(null), 3500);
    } catch (error) {
      setOperationMsg(error instanceof Error ? error.message : "WhatsApp gagal dikirim.");
    } finally {
      setWaBusy(false);
    }
  }

  async function handleRecordInbound() {
    if (!inboundText.trim()) return;
    setWaBusy(true);
    try {
      const response = await apiFetch(`/api/whatsapp/inbound/${account.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: waTo || account.phone || account.ownerPhone || "628000000000", body: inboundText })
      });
      const payload = await response.json();
      await loadWaConversation();
      await onAfterWhatsAppSend?.();
      setInboundText("");
      setOperationMsg(response.ok ? `Balasan diklasifikasikan sebagai ${payload.signal}.` : payload.error ?? "Gagal mencatat balasan.");
      setTimeout(() => setOperationMsg(null), 3500);
    } catch (error) {
      setOperationMsg(error instanceof Error ? error.message : "Gagal mencatat balasan.");
    } finally {
      setWaBusy(false);
    }
  }

  const lastSignal = waMessages.find((message) => message.direction === "inbound")?.signal ?? "unknown";

  return (
    <aside className="detailPanel">
      <div className="detailHeader">
        <div>
          <span>Detail Prospek</span>
          <h2>{account.name}</h2>
        </div>
        <button onClick={onClose} className="iconOnly borderBtn">
          <X size={18} />
        </button>
      </div>

      <div className="detailBody">
        {operationMsg && (
          <div className="operationAlert">
            <AlertCircle size={14} />
            <span>{operationMsg}</span>
          </div>
        )}

        <div className="leadQuickInfo">
          <div className="infoLine"><span>Kategori:</span><strong>{industry}</strong></div>
          <div className="infoLine"><span>Kota:</span><strong>{location}</strong></div>
          <div className="infoLine"><span>Pengambil Keputusan (DM):</span><strong>{decisionMaker}</strong></div>
        </div>

        <hr className="divider" />

        <section className="waAgentCard">
          <div className="waAgentHeader">
            <div>
              <span><Bot size={13} /> WA Agentic MVP</span>
              <h3>Hubungi & Klasifikasikan</h3>
            </div>
            <em>{lastSignal}</em>
          </div>

          <label>
            Nomor Tujuan
            <input value={waTo} onChange={(event) => setWaTo(event.target.value)} placeholder="628..." />
          </label>

          <label>
            Draft Pesan
            <textarea value={waDraft} onChange={(event) => setWaDraft(event.target.value)} />
          </label>

          <div className="waAgentActions">
            <button className="ghostBtn" type="button" onClick={loadWaConversation} disabled={waBusy}>
              <RefreshCw size={13} /> Draft Ulang
            </button>
            <button className="primaryBtn" type="button" onClick={handleSendWhatsApp} disabled={waBusy || !waDraft.trim() || !waTo.trim()}>
              <Send size={13} /> Kirim WA
            </button>
          </div>

          <div className="waInboundSimulator">
            <label>
              Simulasi Balasan Masuk
              <textarea value={inboundText} onChange={(event) => setInboundText(event.target.value)} placeholder="Contoh: Boleh, harganya berapa ya?" />
            </label>
            <button className="ghostBtn" type="button" onClick={handleRecordInbound} disabled={waBusy || !inboundText.trim()}>
              <MessageCircle size={13} /> Klasifikasikan
            </button>
          </div>

          <div className="waTimeline">
            {waMessages.slice(0, 6).map((message) => (
              <div key={message.id} className={`waBubble ${message.direction}`}>
                <div>
                  <strong>{message.direction === "outbound" ? "Daus" : account.name}</strong>
                  <span>{message.status} · {message.signal}</span>
                </div>
                <p>{message.body}</p>
                {message.error && <small>{message.error}</small>}
              </div>
            ))}
            {waMessages.length === 0 && <p className="waEmpty">Belum ada percakapan WhatsApp untuk prospek ini.</p>}
          </div>
        </section>

        <hr className="divider" />

        {/* Inputs */}
        <label>
          Kategori Industri
          <input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Masukkan kategori..." />
        </label>

        <label>
          Kota / Lokasi
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Masukkan kota..." />
        </label>

        <label>
          Pengambil Keputusan (DM)
          <input value={decisionMaker} onChange={(event) => setDecisionMaker(event.target.value)} placeholder="Nama PM / DM..." />
        </label>

        <label>
          Owner
          <select 
            value={account.owner} 
            onChange={(event) => onPatch({ owner: event.target.value as ProspectOwner })}
          >
            {pics.map((pic) => <option key={pic} value={pic}>{pic}</option>)}
          </select>
        </label>

        <label>
          Rekomendasi Produk Utama
          <select 
            value={account.offerMatch[0] ?? ""} 
            onChange={(event) => onPatch({ offerMatch: event.target.value ? [event.target.value] : [] })}
          >
            <option value="">Pilih Produk</option>
            {productOptions(offers).map((product) => <option key={product} value={product}>{product}</option>)}
          </select>
        </label>

        <label>
          Nilai Deal / Closing (IDR)
          <input
            type="number"
            value={dealValue}
            onChange={(event) => setDealValue(Number(event.target.value))}
            placeholder="Masukkan nominal deal..."
          />
        </label>

        <label>
          Nomor Admin / WhatsApp Bisnis
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contoh: 628123456789" />
        </label>

        <label>
          Email Admin / Brand
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" />
        </label>

        <label>
          Website Brand
          <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://..." />
        </label>

        <label>
          Instagram Brand / Admin
          <input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@brand" />
        </label>

        <label>
          TikTok
          <input value={tiktok} onChange={(event) => setTiktok(event.target.value)} placeholder="@brand" />
        </label>

        <label>
          Facebook Brand
          <input value={facebook} onChange={(event) => setFacebook(event.target.value)} placeholder="https://facebook.com/brand" />
        </label>

        <label>
          LinkedIn Brand
          <input value={linkedin} onChange={(event) => setLinkedin(event.target.value)} placeholder="https://linkedin.com/company/brand" />
        </label>

        <label>
          Google Business Profile
          <input value={googleBusinessProfile} onChange={(event) => setGoogleBusinessProfile(event.target.value)} placeholder="https://maps.google.com/..." />
        </label>

        <hr className="divider" />

        <label>
          Nama Owner
          <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Nama pemilik / founder..." />
        </label>

        <label>
          Instagram Owner
          <input value={ownerInstagram} onChange={(event) => setOwnerInstagram(event.target.value)} placeholder="@owner" />
        </label>

        <label>
          Nomor HP Owner
          <input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} placeholder="Contoh: 628..." />
        </label>

        <label>
          Facebook Owner
          <input value={ownerFacebook} onChange={(event) => setOwnerFacebook(event.target.value)} placeholder="https://facebook.com/owner" />
        </label>

        <label>
          LinkedIn Owner
          <input value={ownerLinkedin} onChange={(event) => setOwnerLinkedin(event.target.value)} placeholder="https://linkedin.com/in/owner" />
        </label>

        <label>
          Email Owner
          <input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="owner@example.com" />
        </label>

        <label>
          Progress Pipeline
          <select 
            value={account.stage} 
            onChange={(event) => onPatch({ stage: event.target.value as PipelineStage })}
          >
            {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
        </label>

        <label>
          Tanggal Meeting
          <input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
        </label>

        <label>
          Next Action (Langkah Selanjutnya)
          <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
        </label>

        <label>
          Catatan Negosiasi (Notes)
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <button className="primaryWide" onClick={handleSaveDetail}>Simpan Detail</button>
      </div>
    </aside>
  );
}
