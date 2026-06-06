import React, { useState } from "react";
import { Search, Plus, ChevronDown, MoreHorizontal } from "lucide-react";
import type { Account, Offer, Opportunity, PipelineStage } from "../../shared/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const dealColumns: Array<{ title: string; stages: PipelineStage[] }> = [
  { title: "Belum Dihubungi", stages: ["Belum Dihubungi"] },
  { title: "Potensial", stages: ["Potensial"] },
  { title: "Tahap Briefing", stages: ["Tahap Briefing"] },
  { title: "Meeting", stages: ["Meeting"] },
  { title: "Negosiasi", stages: ["Negosiasi"] },
  { title: "Kirim Proposal", stages: ["Kirim Proposal"] },
  { title: "Closed Won (Deal)", stages: ["Closed Won (Deal)"] },
  { title: "Nurturing", stages: ["Nurturing"] }
];

const stageBorderColors: Record<PipelineStage, string> = {
  "Belum Dihubungi": "#cbd5e1",
  "Potensial": "#fde68a",
  "Tahap Briefing": "#bfdbfe",
  "Meeting": "#fbcfe8",
  "Negosiasi": "#fecdd3",
  "Kirim Proposal": "#ddd6fe",
  "Closed Won (Deal)": "#a7f3d0",
  "Nurturing": "#e2e8f0"
};

function dealValueFor(account: Account) {
  return account.dealValue ?? 0;
}

interface DealsPageProps {
  accounts: Account[];
  offers: Offer[];
  opportunities: Opportunity[];
  summary: { totalPotentialDeal: number } | null;
  onCreateDeal: () => void;
  onOpenAccount: (account: Account) => void;
  onUpdateStage: (id: string, stage: PipelineStage) => void;
}

export default function DealsPage({
  accounts,
  offers,
  opportunities,
  summary,
  onCreateDeal,
  onOpenAccount,
  onUpdateStage
}: DealsPageProps) {
  const [dealSearch, setDealSearch] = useState("");
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const term = dealSearch.trim().toLowerCase();
  
  const filteredAccounts = accounts.filter((account) =>
    !term || `${account.name} ${account.industry} ${account.owner} ${account.offerMatch.join(" ")}`.toLowerCase().includes(term)
  );

  const handleDragStart = (e: React.DragEvent, accountId: string) => {
    e.dataTransfer.setData("text/plain", accountId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnTitle: string) => {
    e.preventDefault();
    setDraggedOverColumn(columnTitle);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: PipelineStage) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const accountId = e.dataTransfer.getData("text/plain");
    if (accountId) {
      onUpdateStage(accountId, targetStage);
    }
  };

  return (
    <section className="dealsPage">
      <header className="dealsTopbar">
        <div className="dealsTitle">Pipeline Penjualan</div>
        <div className="dealsSearch">
          <Search size={18} />
          <input
            value={dealSearch}
            onChange={(event) => setDealSearch(event.target.value)}
            placeholder="Cari prospek atau PIC..."
          />
        </div>
        <div className="dealsMoney">
          <span>Total Nilai Peluang</span>
          <strong>{rupiah.format(summary?.totalPotentialDeal ?? 0)}</strong>
        </div>
        <button className="createDealBtn" onClick={onCreateDeal}>
          <Plus size={18} /> Tambah Deal
        </button>
      </header>

      <div className="dealViewTabs">
        <button className="active">Semua Deal</button>
        <button>Prospek Saya</button>
        <button>Aktivitas Baru</button>
        <button>Deal Bulan Ini</button>
      </div>

      <div className="dealColumns">
        {dealColumns.map((column) => {
          const items = filteredAccounts.filter((account) => column.stages.includes(account.stage));
          const total = items.reduce((sum, account) => sum + dealValueFor(account), 0);
          return (
            <div 
              className={`dealColumn ${draggedOverColumn === column.title ? "drag-over" : ""}`} 
              key={column.title}
              onDragOver={(e) => handleDragOver(e, column.title)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.stages[0])}
            >
              <div className="dealColumnHeader">
                <div>
                  <strong>{column.title}</strong>
                  <span>{rupiah.format(total)} • {items.length} deal</span>
                </div>
              </div>
              <div className="dealCardStack">
                {items.map((account) => {
                  const value = dealValueFor(account);
                  const isClosedWon = account.stage === "Closed Won (Deal)";
                  const isClosedLost = account.stage === "Nurturing";
                  const cardClass = isClosedWon 
                    ? "dealKanbanCard won" 
                    : isClosedLost 
                      ? "dealKanbanCard lost" 
                      : "dealKanbanCard active-deal";
                  
                  const borderColor = stageBorderColors[account.stage] ?? "#cbd5e1";
                  
                  return (
                    <article 
                      className={cardClass} 
                      key={account.id}
                      onClick={() => onOpenAccount(account)}
                      style={{ cursor: "grab", borderColor, borderWidth: "1.5px", borderStyle: "solid" }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, account.id)}
                    >
                      <div className="dealCardTitle">
                        <strong>{account.name}</strong>
                        <button 
                          className="iconOnly"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAccount(account);
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                      <div className="dealActivity">
                        <span>{account.industry}</span>
                        <b>{rupiah.format(value)}</b>
                      </div>
                      <div className="dealCardFooter">
                        <span>PIC: {account.owner}</span>
                        {account.offerMatch[0] && <em>{account.offerMatch[0]}</em>}
                      </div>
                    </article>
                  );
                })}
                {items.length === 0 && (
                  <div className="columnEmptyState">Kosong</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

