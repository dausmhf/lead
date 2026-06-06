import React, { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import type { Account, Offer, Opportunity, PipelineStage, ProspectOwner } from "../../shared/types";

function productOptions(offers: Offer[]) {
  return [...new Set(["Website Company Profile", "Landing Page Conversion", "Website Toko Online", "Maintenance Website", ...offers.map((offer) => offer.name)])];
}

const stages: PipelineStage[] = [
  "Belum Dihubungi",
  "Potensial",
  "Tahap Briefing",
  "Meeting",
  "Negosiasi",
  "Kirim Proposal",
  "Closed Won (Deal)",
  "Nurturing"
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
  const [website, setWebsite] = useState(account.website ?? "");
  const [instagram, setInstagram] = useState(account.instagram ?? "");
  const [tiktok, setTiktok] = useState(account.tiktok ?? "");
  const [googleBusinessProfile, setGoogleBusinessProfile] = useState(account.googleBusinessProfile ?? "");
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
    setWebsite(account.website ?? "");
    setInstagram(account.instagram ?? "");
    setTiktok(account.tiktok ?? "");
    setGoogleBusinessProfile(account.googleBusinessProfile ?? "");
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
      website,
      instagram,
      tiktok,
      googleBusinessProfile,
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
          PIC Prospek
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
          Nomor WhatsApp / HP
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contoh: 628123456789" />
        </label>

        <label>
          Website
          <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://..." />
        </label>

        <label>
          Instagram
          <input value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="@brand" />
        </label>

        <label>
          TikTok
          <input value={tiktok} onChange={(event) => setTiktok(event.target.value)} placeholder="@brand" />
        </label>

        <label>
          Google Business Profile
          <input value={googleBusinessProfile} onChange={(event) => setGoogleBusinessProfile(event.target.value)} placeholder="https://maps.google.com/..." />
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
