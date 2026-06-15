import React, { useMemo, useRef } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Upload, 
  Globe, 
  Instagram, 
  Phone, 
  Mail,
  Facebook,
  Linkedin,
  UserRound,
  ExternalLink,
  Trash2,
  Building2,
  MapPin,
  BriefcaseBusiness,
  MessageCircle,
  ArrowUpRight
} from "lucide-react";
import type { Account, Offer, PipelineStage, ProspectOwner } from "../../shared/types";

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

const stageRank = new Map<PipelineStage, number>(stages.map((stage, index) => [stage, index]));

const stageColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Belum Dihubungi": { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1", dot: "#475569" },
  "Chat Admin": { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa", dot: "#ea580c" },
  "Chat Management": { bg: "#fffbeb", text: "#d97706", border: "#fde68a", dot: "#d97706" },
  "Kirim Proposal": { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe", dot: "#7c3aed" },
  "Meeting": { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8", dot: "#db2777" },
  "Negosiasi": { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", dot: "#e11d48" },
  "Kirim MOU": { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe", dot: "#4f46e5" },
  "Transfer": { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc", dot: "#0891b2" },
  "Closed (WON)": { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0", dot: "#059669" },
  "Ditolak": { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", dot: "#dc2626" }
};

interface Filters {
  owners: ProspectOwner[];
  cities: string[];
  industries: string[];
  stages: PipelineStage[];
}

interface LeadsSearchProps {
  accounts: Account[];
  offers: Offer[];
  filters: Filters | null;
  search: string;
  setSearch: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  industry: string;
  setIndustry: (val: string) => void;
  owner: string;
  setOwner: (val: string) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  compact: boolean;
  setCompact: (val: boolean) => void;
  busy: boolean;
  onImportXlsx: (file: File) => void;
  onDownloadTemplate: () => void;
  onAddManualLead: () => void;
  onOpenAccount: (account: Account) => void;
  onPatchAccount: (id: string, fields: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
  onBulkUpdate: (fields: Partial<Account>) => void;
  onBulkDelete: () => void;
  onOpenWhatsapp: (account: Account, contactType: "owner" | "brand") => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

const stageTabs: Array<{ id: string; label: string; stage?: PipelineStage }> = [
  { id: "all", label: "Semua Prospek" },
  { id: "prospek", label: "Belum Dihubungi", stage: "Belum Dihubungi" },
  { id: "chat_admin", label: "Chat Admin", stage: "Chat Admin" },
  { id: "chat_management", label: "Chat Management", stage: "Chat Management" },
  { id: "proposal", label: "Kirim Proposal", stage: "Kirim Proposal" },
  { id: "meeting", label: "Meeting", stage: "Meeting" },
  { id: "dealing", label: "Negosiasi", stage: "Negosiasi" },
  { id: "mou", label: "Kirim MOU", stage: "Kirim MOU" },
  { id: "transfer", label: "Transfer", stage: "Transfer" },
  { id: "completed", label: "Closed (WON)", stage: "Closed (WON)" },
  { id: "rejected", label: "Ditolak", stage: "Ditolak" }
];

function phoneUrl(phone?: string) {
  const digits = phone?.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

function instagramUrl(handle?: string) {
  if (!handle) return "";
  if (handle.startsWith("http")) return handle;
  return `https://instagram.com/${handle.replace("@", "")}`;
}

function socialUrl(value?: string, fallbackBase?: string) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  return fallbackBase ? `${fallbackBase}${value.replace("@", "")}` : value;
}

function ChannelLink({
  href,
  title,
  onClick,
  children
}: {
  href?: string;
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span className="channelIcon disabled" title={`${title} belum ada`}>
        {children}
      </span>
    );
  }
  if (onClick) {
    return (
      <button className="channelIcon active" type="button" onClick={onClick} title={title}>
        {children}
      </button>
    );
  }
  return (
    <a className="channelIcon active" href={href} target="_blank" rel="noreferrer" title={title}>
      {children}
    </a>
  );
}

export default function LeadsSearch({
  accounts,
  offers,
  filters,
  search,
  setSearch,
  city,
  setCity,
  industry,
  setIndustry,
  owner,
  setOwner,
  selectedIds,
  setSelectedIds,
  expandedId,
  setExpandedId,
  compact,
  setCompact,
  busy,
  onImportXlsx,
  onDownloadTemplate,
  onAddManualLead,
  onOpenAccount,
  onPatchAccount,
  onDeleteAccount,
  onBulkUpdate,
  onBulkDelete,
  onOpenWhatsapp,
  activeView,
  setActiveView
}: LeadsSearchProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeStage = stageTabs.find((tab) => tab.id === activeView)?.stage;

  const productOptions = useMemo(() => {
    const productNames = new Set<string>();
    for (const offer of offers) {
      if (offer.name) productNames.add(offer.name);
    }
    for (const account of accounts) {
      for (const product of account.offerMatch) {
        if (product) productNames.add(product);
      }
    }
    return [...productNames].sort((a, b) => a.localeCompare(b, "id"));
  }, [accounts, offers]);

  const countsByStage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const account of accounts) {
      counts[account.stage] = (counts[account.stage] ?? 0) + 1;
    }
    return counts;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) => {
      const haystack = `${account.name} ${account.industry} ${account.location} ${account.decisionMaker} ${account.ownerName ?? ""} ${account.ownerInstagram ?? ""} ${account.offerMatch.join(" ")}`.toLowerCase();
      return (
        (!term || haystack.includes(term)) &&
        (!activeStage || account.stage === activeStage) &&
        (!city || account.location === city) &&
        (!industry || account.offerMatch.includes(industry)) &&
        (!owner || account.owner === owner)
      );
    }).sort((a, b) => {
      const stageDiff = (stageRank.get(a.stage) ?? 999) - (stageRank.get(b.stage) ?? 999);
      if (stageDiff !== 0) return stageDiff;
      const scoreDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dealDiff = (b.dealValue ?? 0) - (a.dealValue ?? 0);
      if (dealDiff !== 0) return dealDiff;
      return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    });
  }, [accounts, activeStage, city, industry, owner, search]);

  const allSelected = filteredAccounts.length > 0 && filteredAccounts.every((account) => selectedIds.has(account.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map((account) => account.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkStage = (stage: PipelineStage) => {
    onBulkUpdate({ stage, briefStatus: stage === "Kirim Proposal" ? "Brief Sent" : undefined });
  };

  return (
    <div className="leadsSearchSection">
      {/* Top filter bar */}
      <div className="topFilterBar">
        <div className="searchInput">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari owner, marketing, PIC, brand..."
          />
        </div>
        
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Semua Kota</option>
          {filters?.cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Semua Produk</option>
          {productOptions.map((product) => (
            <option key={product} value={product}>{product}</option>
          ))}
        </select>

        <button 
          className={compact ? "ghostBtn active" : "ghostBtn"} 
          onClick={() => setCompact(!compact)}
        >
          Kompak
        </button>

        <button className="ghostBtn" onClick={onDownloadTemplate}>
          <Download size={14} /> Draf Excel
        </button>

        <button className="ghostBtn" onClick={onAddManualLead}>
          Tambah Manual
        </button>

        <button className="primaryBtn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Impor XLSX
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportXlsx(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* Tabs */}
      <div className="viewTabs">
        {stageTabs.map((tab) => (
          <button
            key={tab.id}
            className={activeView === tab.id ? "active" : ""}
            onClick={() => setActiveView(tab.id)}
          >
            {tab.label}
            {tab.stage && countsByStage[tab.stage] > 0 && (
              <span>{countsByStage[tab.stage]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bulkBar">
          <span>{selectedIds.size} prospek terpilih</span>
          <select 
            onChange={(e) => e.target.value && handleBulkStage(e.target.value as PipelineStage)} 
            defaultValue=""
          >
            <option value="">Ubah Progress</option>
            {stages.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <button className="bulkDeleteBtn" onClick={onBulkDelete}>
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}>Batal</button>
        </div>
      )}

      <div className="ownerCardContent">
        <div className="ownerCardToolbar">
          <label>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            Pilih semua
          </label>
          <span>{filteredAccounts.length} orang ditemukan</span>
        </div>

        <section className={`ownerCardGrid ${compact ? "compact" : ""}`}>
          {filteredAccounts.map((account) => {
            const color = stageColors[account.stage] ?? stageColors["Belum Dihubungi"];
            const contactName = account.ownerName || account.decisionMaker || "Owner belum ditemukan";
            const role = account.decisionMaker && account.decisionMaker !== contactName
              ? account.decisionMaker
              : "Owner / Marketing / PIC";
            const ownerWhatsapp = phoneUrl(account.ownerPhone);
            const brandWhatsapp = phoneUrl(account.phone);
            const initials = contactName === "Owner belum ditemukan"
              ? "?"
              : contactName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

            return (
              <article
                key={account.id}
                className={`ownerProspectCard ${selectedIds.has(account.id) ? "selected" : ""}`}
                onClick={() => onOpenAccount(account)}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onOpenAccount(account);
                }}
              >
                <div className="ownerCardTop">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(account.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => toggleSelectOne(account.id)}
                    aria-label={`Pilih ${contactName}`}
                  />
                  <span
                    className="ownerStageBadge"
                    style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                  >
                    {account.stage}
                  </span>
                  <button
                    className="ownerDeleteButton"
                    type="button"
                    title="Hapus prospek"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteAccount(account.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="ownerIdentity">
                  <div className={`ownerAvatar ${account.ownerName ? "" : "missing"}`}>{initials}</div>
                  <div>
                    <h3>{contactName}</h3>
                    <p><BriefcaseBusiness size={13} /> {role}</p>
                  </div>
                </div>

                <div className="ownerBrandBlock">
                  <strong><Building2 size={14} /> {account.name}</strong>
                  <span><MapPin size={13} /> {account.location || "Lokasi belum ada"}</span>
                  <small>{account.industry || "Industri belum diklasifikasikan"}</small>
                </div>

                <div className="ownerProduct">
                  <span>Produk</span>
                  <strong>{account.offerMatch[0] || "Belum dipilih"}</strong>
                </div>

                <div className="ownerContactGroups" onClick={(event) => event.stopPropagation()}>
                  <div className="ownerContactGroup">
                    <span>Owner / PIC</span>
                    <div className="ownerContactRow">
                      <ChannelLink
                        href={ownerWhatsapp}
                        title="Buka WhatsApp Owner di Inbox"
                        onClick={() => onOpenWhatsapp(account, "owner")}
                      >
                        <MessageCircle size={15} />
                      </ChannelLink>
                      <ChannelLink href={instagramUrl(account.ownerInstagram)} title="Instagram Owner"><Instagram size={15} /></ChannelLink>
                      <ChannelLink href={socialUrl(account.ownerLinkedin, "https://linkedin.com/in/")} title="LinkedIn Owner"><Linkedin size={15} /></ChannelLink>
                      <ChannelLink href={socialUrl(account.ownerFacebook, "https://facebook.com/")} title="Facebook Owner"><Facebook size={15} /></ChannelLink>
                      <ChannelLink href={account.ownerEmail ? `mailto:${account.ownerEmail}` : ""} title="Email Owner"><Mail size={15} /></ChannelLink>
                    </div>
                  </div>
                  <div className="ownerContactGroup brandAudit">
                    <span>Admin Brand · Audit</span>
                    <div className="ownerContactRow">
                      <ChannelLink
                        href={brandWhatsapp}
                        title="Buka WhatsApp Admin Brand di Inbox"
                        onClick={() => onOpenWhatsapp(account, "brand")}
                      >
                        <MessageCircle size={15} />
                      </ChannelLink>
                      <ChannelLink href={instagramUrl(account.instagram)} title="Instagram Brand"><Instagram size={15} /></ChannelLink>
                      <ChannelLink href={account.email ? `mailto:${account.email}` : ""} title="Email Brand"><Mail size={15} /></ChannelLink>
                    </div>
                  </div>
                </div>

                <div className="ownerCardFooter">
                  <div>
                    <span>Nilai deal</span>
                    <strong>Rp {(account.dealValue ?? 0).toLocaleString("id-ID")}</strong>
                  </div>
                  <span className="ownerDetailLink">Lihat profil <ArrowUpRight size={14} /></span>
                </div>
              </article>
            );
          })}

          {filteredAccounts.length === 0 && (
            <div className="emptyState ownerEmptyState">
              <UserRound size={28} />
              <strong>Belum ada prospek orang</strong>
              <span>Tambahkan Owner, Marketing, atau PIC untuk mulai prospecting.</span>
            </div>
          )}
        </section>

        <div className="paginationBar ownerPagination">
          <span>Menampilkan {filteredAccounts.length} dari {accounts.length} prospek</span>
          <span>{busy ? "Memperbarui..." : "Sinkronisasi Aktif"}</span>
        </div>
      </div>

      {false && (
      /* Legacy table retained temporarily for data-control compatibility */
      <div className="leadContent">
        <section className={`leadTablePane ${compact ? "compact" : ""}`}>
          <div className="tableHeader">
            <div className="selectCell">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
            </div>
            <div className="chevCell" />
            <div className="businessCol">Brand</div>
            <div className="progressCol">Progress</div>
            <div className="productCol">Produk</div>
            <div className="meetingCol">Tgl Meeting</div>
            <div className="channelsCol">Kanal Brand</div>
            <div className="ownerNameCol">Owner / Management</div>
            <div className="ownerChannelsCol">Kanal Owner</div>
            <div className="dealCol">Nilai Deal</div>
            <div className="actionsOnlyCol">Aksi</div>
          </div>

          <div className="leadRows">
            {filteredAccounts.map((account) => {
              const color = stageColors[account.stage] ?? stageColors["Belum Dihubungi"];
              const isExpanded = expandedId === account.id;

              return (
                <React.Fragment key={account.id}>
                  <div className={`leadRow ${selectedIds.has(account.id) ? "selected" : ""}`}>
                    <div className="selectCell">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(account.id)}
                        onChange={() => toggleSelectOne(account.id)}
                      />
                    </div>
                    
                    <button
                      className="chevCell iconOnly"
                      onClick={() => setExpandedId(isExpanded ? null : account.id)}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>

                    <div className="businessCol">
                      <strong>{account.name}</strong>
                      <small>
                        {account.location}
                        {account.phone ? ` | ${account.phone}` : ""}
                        {` | Rp ${(account.dealValue ?? 0).toLocaleString("id-ID")}`}
                      </small>
                    </div>

                    <div className="progressCol">
                      <select
                        value={account.stage}
                        onChange={(e) => onPatchAccount(account.id, { 
                          stage: e.target.value as PipelineStage,
                          briefStatus: e.target.value === "Kirim Proposal" ? "Brief Sent" : account.briefStatus 
                        })}
                        style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                      >
                        {stages.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="productCol">
                      <select
                        value={account.offerMatch[0] ?? ""}
                        onChange={(e) => onPatchAccount(account.id, { offerMatch: e.target.value ? [e.target.value] : [] })}
                      >
                        <option value="">Pilih Produk</option>
                        {offers.map((off) => (
                          <option key={off.id} value={off.name}>{off.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="meetingCol">
                      {account.stage === "Meeting" ? (
                        <input
                          type="date"
                          className="meetingDateInput"
                          value={account.meetingDate ?? ""}
                          onChange={(e) => onPatchAccount(account.id, { meetingDate: e.target.value || undefined })}
                          data-filled={account.meetingDate ? "true" : "false"}
                        />
                      ) : (
                        <span style={{ fontSize: "11px", color: "#cbd5e1" }}>—</span>
                      )}
                    </div>

                    <div className="channelsCol">
                      <ChannelLink href={account.website} title="Website Brand"><Globe size={13} /></ChannelLink>
                      <ChannelLink href={instagramUrl(account.instagram)} title="Instagram Brand"><Instagram size={13} /></ChannelLink>
                      <ChannelLink href={phoneUrl(account.phone)} title="WhatsApp Admin"><Phone size={13} /></ChannelLink>
                      <ChannelLink href={account.email ? `mailto:${account.email}` : ""} title="Email Brand"><Mail size={13} /></ChannelLink>
                      <ChannelLink href={socialUrl(account.facebook, "https://facebook.com/")} title="Facebook Brand"><Facebook size={13} /></ChannelLink>
                      <ChannelLink href={socialUrl(account.linkedin, "https://linkedin.com/in/")} title="LinkedIn Brand"><Linkedin size={13} /></ChannelLink>
                    </div>

                    <div className="ownerNameCol">
                      <strong title={account.ownerName || "Nama owner/management belum ada"}>{account.ownerName || "Belum ada"}</strong>
                      <small>{account.decisionMaker && account.decisionMaker !== "Belum diketahui" ? account.decisionMaker : "Management belum valid"}</small>
                    </div>

                    <div className="ownerChannelsCol">
                      <div className="ownerChannels">
                        <ChannelLink href={instagramUrl(account.ownerInstagram)} title="Instagram Owner"><Instagram size={13} /></ChannelLink>
                        <ChannelLink href={phoneUrl(account.ownerPhone)} title="WhatsApp Owner"><Phone size={13} /></ChannelLink>
                        <ChannelLink href={socialUrl(account.ownerFacebook, "https://facebook.com/")} title="Facebook Owner"><Facebook size={13} /></ChannelLink>
                        <ChannelLink href={socialUrl(account.ownerLinkedin, "https://linkedin.com/in/")} title="LinkedIn Owner"><Linkedin size={13} /></ChannelLink>
                        <ChannelLink href={account.ownerEmail ? `mailto:${account.ownerEmail}` : ""} title="Email Owner"><Mail size={13} /></ChannelLink>
                        {!account.ownerName && <span className="channelIcon disabled" title="Nama owner belum ada"><UserRound size={13} /></span>}
                      </div>
                    </div>

                    <div className="dealCol">
                      <div className="dealValueEditor">
                        <span>Rp</span>
                        <input
                          className="dealValueInput"
                          key={account.id + "-" + account.dealValue}
                          type="text"
                          defaultValue={(account.dealValue ?? 0).toLocaleString("id-ID")}
                          onFocus={(e) => {
                            e.target.value = String(Number(e.target.value.replace(/\./g, "")) || 0);
                          }}
                          onBlur={(e) => {
                            const val = Number(e.target.value.replace(/\./g, "")) || 0;
                            e.target.value = val.toLocaleString("id-ID");
                            if (val !== account.dealValue) {
                              onPatchAccount(account.id, { dealValue: val });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="actionsOnlyCol">
                      <button onClick={() => onOpenAccount(account)} className="detailsBtn">
                        <ExternalLink size={12} /> Detail
                      </button>
                      <button
                        onClick={() => onDeleteAccount(account.id)}
                        className="deleteBtn"
                        title="Delete prospek"
                        type="button"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="expandedRow">
                      <div>
                        <h4>Kategori Industri</h4>
                        <p>{account.industry || "—"}</p>
                      </div>
                      <div>
                        <h4>Rekomendasi Produk</h4>
                        <p>{account.offerMatch.join(", ") || "Belum dicocokkan"}</p>
                      </div>
                      <div>
                        <h4>Hipotesis Masalah</h4>
                        <p>{account.problemHypothesis}</p>
                      </div>
                      <div>
                        <h4>Pengambil Keputusan (DM)</h4>
                        <p>{account.decisionMaker}</p>
                      </div>
                      <div>
                        <h4>Data Owner</h4>
                        <p>{[account.ownerName, account.ownerPhone, account.ownerInstagram, account.ownerFacebook, account.ownerLinkedin, account.ownerEmail].filter(Boolean).join(" | ") || "Belum ada data owner."}</p>
                      </div>
                      <div>
                        <h4>Sumber Data</h4>
                        <p>{account.source ?? "Manual"}</p>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {filteredAccounts.length === 0 && (
              <div className="emptyState">Tidak ada prospek ditemukan. Silakan tambahkan kriteria baru.</div>
            )}
          </div>

          <div className="paginationBar">
            <span>Menampilkan {filteredAccounts.length} dari {accounts.length} prospek</span>
            <span>{busy ? "Memperbarui..." : "Sinkronisasi Aktif"}</span>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
