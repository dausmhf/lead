import React, { useMemo } from "react";
import { LayoutDashboard, Users, Trophy, Handshake, DollarSign, Activity } from "lucide-react";
import type { Account, Offer } from "../../shared/types";

interface CrmDashboardProps {
  accounts: Account[];
  offers: Offer[];
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

export default function CrmDashboard({ accounts, offers }: CrmDashboardProps) {
  // Compute top metrics
  const totalLeads = accounts.length;
  const closedWonLeads = accounts.filter((a) => a.stage === "Closed Won (Deal)");
  const closedWonCount = closedWonLeads.length;
  const meetingLeads = accounts.filter((a) => a.stage === "Meeting");
  const meetingCount = meetingLeads.length;
  
  const totalPotentialDeal = accounts.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);
  const totalClosedWonRevenue = closedWonLeads.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);

  // Compute PIC team table
  const pics = ["Daus"];
  
  const picStats = useMemo(() => {
    return pics.map((name) => {
      const picAccounts = accounts.filter((a) => a.owner === name);
      const won = picAccounts.filter((a) => a.stage === "Closed Won (Deal)");
      const meeting = picAccounts.filter((a) => a.stage === "Meeting");
      const potential = picAccounts.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);
      const revenue = won.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);
      
      // Stage detailed counts
      const stagesBreakdown = {
        uncontacted: picAccounts.filter((a) => a.stage === "Belum Dihubungi").length,
        potential: picAccounts.filter((a) => a.stage === "Potensial").length,
        briefing: picAccounts.filter((a) => a.stage === "Tahap Briefing").length,
        meeting: meeting.length,
        negotiation: picAccounts.filter((a) => a.stage === "Negosiasi" || a.stage === "Kirim Proposal").length,
        won: won.length,
        lost: picAccounts.filter((a) => a.stage === "Nurturing").length,
      };

      return {
        name,
        total: picAccounts.length,
        potentialVal: potential,
        wonVal: revenue,
        stagesBreakdown
      };
    });
  }, [accounts]);

  return (
    <section className="crmDashboardPage" style={{ padding: "24px", height: "100%", overflowY: "auto", background: "#f8fafc" }}>
      <header className="pageHeader" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0", display: "flex", alignItems: "center", gap: "10px" }}>
          <LayoutDashboard size={22} color="#2563eb" /> Dashboard Prospek Website
        </h2>
        <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
          Pantau status prospek calon client website, pipeline follow-up, dan potensi revenue deal secara real-time.
        </p>
      </header>

      {/* Top Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "28px" }}>
        
        {/* Total Prospek */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Prospek</span>
            <Users size={18} color="#2563eb" style={{ background: "#eff6ff", padding: "3px", borderRadius: "6px" }} />
          </div>
          <div>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a" }}>{totalLeads}</span>
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>Brand aktif</span>
          </div>
        </div>

        {/* Sudah Deal */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Closed Won</span>
            <Trophy size={18} color="#16a34a" style={{ background: "#f0fdf4", padding: "3px", borderRadius: "6px" }} />
          </div>
          <div>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#16a34a" }}>{closedWonCount}</span>
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>Deal Sukses</span>
          </div>
        </div>

        {/* Masih Meeting */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Dalam Meeting</span>
            <Handshake size={18} color="#d97706" style={{ background: "#fffbeb", padding: "3px", borderRadius: "6px" }} />
          </div>
          <div>
            <span style={{ fontSize: "24px", fontWeight: "800", color: "#d97706" }}>{meetingCount}</span>
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>Dijadwalkan</span>
          </div>
        </div>

        {/* Total Potensi */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Potensi Revenue</span>
            <Activity size={18} color="#7c3aed" style={{ background: "#f5f3ff", padding: "3px", borderRadius: "6px" }} />
          </div>
          <div>
            <span style={{ fontSize: "18px", fontWeight: "800", color: "#7c3aed" }}>{rupiah.format(totalPotentialDeal)}</span>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Seluruh Pipeline</div>
          </div>
        </div>

        {/* Duit Masuk (Won) */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Realisasi Revenue</span>
            <DollarSign size={18} color="#059669" style={{ background: "#ecfdf5", padding: "3px", borderRadius: "6px" }} />
          </div>
          <div>
            <span style={{ fontSize: "18px", fontWeight: "800", color: "#059669" }}>{rupiah.format(totalClosedWonRevenue)}</span>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>Duit Masuk</div>
          </div>
        </div>

      </div>

      {/* Main Stats Area: PIC Performance */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: "0 0 16px 0" }}>
          Laporan Produktivitas Prospek per PIC (User)
        </h3>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: "600" }}>
                <th style={{ padding: "12px 16px" }}>Nama PIC</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Total Lead</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Belum Hubungi</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Potensial</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Briefing</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Meeting</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Proposal/Nego</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#16a34a" }}>Won (Deal)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#ef4444" }}>Nurture/Gagal</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Total Potensi</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#16a34a" }}>Realisasi Revenue</th>
              </tr>
            </thead>
            <tbody>
              {picStats.map((pic) => {
                const winRatePercent = pic.potentialVal > 0 ? Math.round((pic.wonVal / pic.potentialVal) * 100) : 0;
                return (
                  <tr key={pic.name} style={{ borderBottom: "1px solid #f1f5f9", height: "48px" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>
                      {pic.name}
                      <div style={{ fontSize: "10px", fontWeight: "normal", color: "#94a3b8", marginTop: "2px" }}>
                        Win Rate: {winRatePercent}%
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>{pic.total}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#64748b" }}>{pic.stagesBreakdown.uncontacted}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#d97706" }}>{pic.stagesBreakdown.potential}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#2563eb" }}>{pic.stagesBreakdown.briefing}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#ea580c" }}>{pic.stagesBreakdown.meeting}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#7c3aed" }}>{pic.stagesBreakdown.negotiation}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#16a34a", fontWeight: "700" }}>{pic.stagesBreakdown.won}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: "#94a3b8" }}>{pic.stagesBreakdown.lost}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600" }}>{rupiah.format(pic.potentialVal)}</td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#16a34a" }}>{rupiah.format(pic.wonVal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
