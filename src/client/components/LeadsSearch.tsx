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
  ExternalLink,
  Trash2
} from "lucide-react";
import type { Account, Offer, PipelineStage, ProspectOwner } from "../../shared/types";

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

const stageColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Belum Dihubungi": { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1", dot: "#475569" },
  "Potensial": { bg: "#fffbeb", text: "#d97706", border: "#fde68a", dot: "#d97706" },
  "Tahap Briefing": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", dot: "#2563eb" },
  "Meeting": { bg: "#fdf2f8", text: "#db2777", border: "#fbcfe8", dot: "#db2777" },
  "Negosiasi": { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", dot: "#e11d48" },
  "Kirim Proposal": { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe", dot: "#7c3aed" },
  "Closed Won (Deal)": { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0", dot: "#059669" },
  "Nurturing": { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", dot: "#475569" }
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
  activeView: string;
  setActiveView: (view: string) => void;
}

const stageTabs: Array<{ id: string; label: string; stage?: PipelineStage }> = [
  { id: "all", label: "Semua Prospek" },
  { id: "prospek", label: "Belum Dihubungi", stage: "Belum Dihubungi" },
  { id: "qualified", label: "Potensial", stage: "Potensial" },
  { id: "on_brief", label: "Tahap Briefing", stage: "Tahap Briefing" },
  { id: "meeting", label: "Meeting", stage: "Meeting" },
  { id: "dealing", label: "Negosiasi", stage: "Negosiasi" },
  { id: "proposal", label: "Kirim Proposal", stage: "Kirim Proposal" },
  { id: "completed", label: "Closed Won (Deal)", stage: "Closed Won (Deal)" },
  { id: "nurture", label: "Nurturing", stage: "Nurturing" }
];

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
  activeView,
  setActiveView
}: LeadsSearchProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeStage = stageTabs.find((tab) => tab.id === activeView)?.stage;

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
      const haystack = `${account.name} ${account.industry} ${account.location} ${account.decisionMaker} ${account.offerMatch.join(" ")}`.toLowerCase();
      return (
        (!term || haystack.includes(term)) &&
        (!activeStage || account.stage === activeStage) &&
        (!city || account.location === city) &&
        (!industry || account.industry === industry) &&
        (!owner || account.owner === owner)
      );
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
    onBulkUpdate({ stage, briefStatus: stage === "Tahap Briefing" ? "On Brief" : undefined });
  };

  const handleBulkOwner = (owner: ProspectOwner) => {
    onBulkUpdate({ owner });
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
            placeholder="Cari bisnis, kota, kategori..."
          />
        </div>
        
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Semua Kota</option>
          {filters?.cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
          <option value="">Semua Kategori</option>
          {filters?.industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Semua PIC</option>
          {filters?.owners.map((ow) => (
            <option key={ow} value={ow}>{ow}</option>
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
          <select 
            onChange={(e) => e.target.value && handleBulkOwner(e.target.value as ProspectOwner)} 
            defaultValue=""
          >
            <option value="">Ubah PIC</option>
            {filters?.owners.map((ow) => (
              <option key={ow} value={ow}>{ow}</option>
            ))}
          </select>
          <button className="bulkDeleteBtn" onClick={onBulkDelete}>
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())}>Batal</button>
        </div>
      )}

      {/* Table Pane */}
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
            <div className="businessCol">Bisnis / Merek</div>
            <div className="productCol">Rekomendasi Produk</div>
            <div className="progressCol">Progress</div>
            <div className="phoneCol">Call</div>
            <div className="meetingCol">Tgl Meeting</div>
            <div className="followCol">PIC</div>
            <div className="channelsCol">Kanal</div>
            <div className="actionsCol">Nilai Deal & Aksi</div>
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

                    <div className="progressCol">
                      <select
                        value={account.stage}
                        onChange={(e) => onPatchAccount(account.id, { 
                          stage: e.target.value as PipelineStage,
                          briefStatus: e.target.value === "Tahap Briefing" ? "On Brief" : account.briefStatus 
                        })}
                        style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                      >
                        {stages.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="phoneCol">
                      {account.phone ? (
                        <a 
                          className="callBtn"
                          href={`https://wa.me/${account.phone.replace(/[^0-9]/g, "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          title={`Call ${account.phone}`}
                        >
                          <Phone size={12} />
                          Call
                        </a>
                      ) : (
                        <button className="callBtn disabled" type="button" disabled title="Nomor HP belum ada">
                          <Phone size={12} />
                          Call
                        </button>
                      )}
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

                    <div className="followCol">
                      <select
                        value={account.owner}
                        onChange={(e) => onPatchAccount(account.id, { owner: e.target.value as ProspectOwner })}
                      >
                        {filters?.owners.map((ow) => (
                          <option key={ow} value={ow}>{ow}</option>
                        ))}
                      </select>
                    </div>

                    <div className="channelsCol">
                      {account.website && (
                        <a href={account.website} target="_blank" rel="noreferrer" title="Website">
                          <Globe size={13} />
                        </a>
                      )}
                      {account.instagram && (
                        <a href={`https://instagram.com/${account.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" title="Instagram">
                          <Instagram size={13} />
                        </a>
                      )}
                      {account.phone && (
                        <a href={`https://wa.me/${account.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp Chat">
                          <Phone size={13} />
                        </a>
                      )}
                    </div>

                    <div className="actionsCol">
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
    </div>
  );
}
