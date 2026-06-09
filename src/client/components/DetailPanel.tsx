import React, { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import type { Account, Offer, Opportunity, PipelineStage, ProspectOwner } from "../../shared/types";

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
}

export default function DetailPanel({
  account,
  offers,
  pics,
  onClose,
  onPatch
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
