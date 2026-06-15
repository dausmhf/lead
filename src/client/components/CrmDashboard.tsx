import React from "react";
import { Activity, DollarSign, Handshake, LayoutDashboard, PhoneCall, Trophy, Users, XCircle } from "lucide-react";
import type { Account, PipelineStage } from "../../shared/types";

interface CrmDashboardProps {
  accounts: Account[];
  offers?: unknown[];
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const stages: Array<{ stage: PipelineStage; label: string; color: string }> = [
  { stage: "Belum Dihubungi", label: "Belum Dihubungi", color: "#64748b" },
  { stage: "Chat Admin", label: "Chat Admin", color: "#f97316" },
  { stage: "Chat Management", label: "Chat Management", color: "#f59e0b" },
  { stage: "Kirim Proposal", label: "Kirim Proposal", color: "#8b5cf6" },
  { stage: "Meeting", label: "Meeting", color: "#ec4899" },
  { stage: "Negosiasi", label: "Negosiasi", color: "#f43f5e" },
  { stage: "Kirim MOU", label: "Kirim MOU", color: "#6366f1" },
  { stage: "Transfer", label: "Transfer", color: "#06b6d4" },
  { stage: "Closed (WON)", label: "Closed (WON)", color: "#22c55e" },
  { stage: "Ditolak", label: "Ditolak", color: "#ef4444" }
];

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function Donut({
  title,
  value,
  total,
  color,
  subtitle
}: {
  title: string;
  value: number;
  total: number;
  color: string;
  subtitle: string;
}) {
  const percent = pct(value, total);
  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={eyebrowStyle}>{title}</div>
          <div style={{ color: "#0f172a", fontSize: 20, fontWeight: 800, marginTop: 8 }}>
            {value.toLocaleString("id-ID")} <span style={{ color: "#64748b", fontSize: 13 }}>/ {total.toLocaleString("id-ID")}</span>
          </div>
          <p style={{ color: "#64748b", fontSize: 12, margin: "6px 0 0" }}>{subtitle}</p>
        </div>
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            background: `conic-gradient(${color} ${percent * 3.6}deg, #e2e8f0 0deg)`,
            display: "grid",
            placeItems: "center",
            flex: "0 0 92px"
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ffffff", display: "grid", placeItems: "center" }}>
            <strong style={{ color: "#0f172a", fontSize: 16 }}>{percent}%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  color,
  icon
}: {
  label: string;
  value: string | number;
  detail: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={eyebrowStyle}>{label}</span>
        <span style={{ color, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, width: 28, height: 28, display: "grid", placeItems: "center" }}>{icon}</span>
      </div>
      <div style={{ color: "#0f172a", fontSize: 24, fontWeight: 800, marginTop: 14 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{detail}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 18,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)"
};

const eyebrowStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.4
};

export default function CrmDashboard({ accounts }: CrmDashboardProps) {
  const totalLeads = accounts.length;
  const untouched = accounts.filter((a) => a.stage === "Belum Dihubungi").length;
  const contacted = totalLeads - untouched;
  const meetingPath = accounts.filter((a) => ["Meeting", "Negosiasi", "Kirim MOU", "Transfer", "Closed (WON)"].includes(a.stage)).length;
  const meetingNow = accounts.filter((a) => a.stage === "Meeting").length;
  const closedWon = accounts.filter((a) => a.stage === "Closed (WON)");
  const rejected = accounts.filter((a) => a.stage === "Ditolak").length;
  const proposalAndUp = accounts.filter((a) => ["Kirim Proposal", "Meeting", "Negosiasi", "Kirim MOU", "Transfer", "Closed (WON)"].includes(a.stage)).length;
  const potentialRevenue = accounts
    .filter((a) => ["Meeting", "Negosiasi", "Kirim MOU", "Transfer", "Closed (WON)"].includes(a.stage))
    .reduce((sum, a) => sum + (a.dealValue ?? 0), 0);
  const realizedRevenue = closedWon.reduce((sum, a) => sum + (a.dealValue ?? 0), 0);

  const stageCounts = stages.map((item) => ({
    ...item,
    count: accounts.filter((account) => account.stage === item.stage).length
  }));
  const stageGradient = stageCounts
    .reduce<{ parts: string[]; cursor: number }>((acc, item) => {
      const degrees = totalLeads ? (item.count / totalLeads) * 360 : 0;
      if (degrees > 0) {
        acc.parts.push(`${item.color} ${acc.cursor}deg ${acc.cursor + degrees}deg`);
        acc.cursor += degrees;
      }
      return acc;
    }, { parts: [], cursor: 0 }).parts.join(", ");

  return (
    <section className="crmDashboardPage" style={{ padding: 24, height: "100%", overflowY: "auto", background: "#f8fafc" }}>
      <header className="pageHeader" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 16, marginBottom: 22 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <LayoutDashboard size={22} color="#0f172a" /> Dashboard Progress Prospek
        </h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
          Ringkasan funnel dari total lead, lead yang sudah dihubungi, meeting, sampai closing.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(150px, 1fr))", gap: 14, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}>
        <MetricCard label="Total Lead" value={totalLeads} detail="Semua prospek aktif" color="#0f172a" icon={<Users size={16} />} />
        <MetricCard label="Dihubungi" value={contacted} detail={`${pct(contacted, totalLeads)}% dari total lead`} color="#0284c7" icon={<PhoneCall size={16} />} />
        <MetricCard label="Ditolak" value={rejected} detail={`${pct(rejected, contacted)}% dari lead dihubungi`} color="#dc2626" icon={<XCircle size={16} />} />
        <MetricCard label="Meeting Path" value={meetingPath} detail={`${pct(meetingPath, contacted)}% dari lead dihubungi`} color="#db2777" icon={<Handshake size={16} />} />
        <MetricCard label="Potensi Revenue" value={rupiah.format(potentialRevenue)} detail="Dihitung dari meeting ke atas" color="#7c3aed" icon={<Activity size={16} />} />
        <MetricCard label="Closed (WON)" value={closedWon.length} detail={`${pct(closedWon.length, Math.max(meetingPath, 1))}% dari meeting path`} color="#059669" icon={<Trophy size={16} />} />
        <MetricCard label="Realisasi" value={rupiah.format(realizedRevenue)} detail="Revenue masuk" color="#059669" icon={<DollarSign size={16} />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(260px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Donut title="Lead Sudah Dihubungi" value={contacted} total={totalLeads} color="#0284c7" subtitle="Perbandingan total lead dengan yang sudah keluar dari status belum dihubungi." />
        <Donut title="Dihubungi ke Meeting" value={meetingPath} total={contacted} color="#db2777" subtitle="Lead yang sudah naik ke meeting/negosiasi/MOU/transfer/closed dibanding semua yang sudah dihubungi." />
        <Donut title="Meeting ke Closed" value={closedWon.length} total={meetingPath} color="#059669" subtitle="Rasio closing dari lead yang sudah masuk jalur meeting." />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.9fr) minmax(420px, 1.4fr)", gap: 16 }}>
        <div style={panelStyle}>
          <div style={eyebrowStyle}>Sebaran Stage</div>
          <div style={{ display: "grid", gridTemplateColumns: "132px 1fr", gap: 18, alignItems: "center", marginTop: 16 }}>
            <div
              style={{
                width: 132,
                height: 132,
                borderRadius: "50%",
                background: `conic-gradient(${stageGradient || "#e2e8f0 0deg 360deg"})`,
                display: "grid",
                placeItems: "center"
              }}
            >
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#ffffff", display: "grid", placeItems: "center", textAlign: "center" }}>
                <strong style={{ color: "#0f172a", fontSize: 22 }}>{totalLeads}</strong>
                <span style={{ color: "#64748b", fontSize: 11 }}>lead</span>
              </div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {stageCounts.filter((item) => item.count > 0).map((item) => (
                <div key={item.stage} style={{ display: "grid", gridTemplateColumns: "12px 1fr auto", gap: 8, alignItems: "center", color: "#475569", fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: item.color }} />
                  <span>{item.label}</span>
                  <strong style={{ color: "#0f172a" }}>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={eyebrowStyle}>Funnel Progress</div>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {[
              { label: "Total Lead", count: totalLeads, base: totalLeads, color: "#475569" },
              { label: "Lead Dihubungi", count: contacted, base: totalLeads, color: "#0284c7" },
              { label: "Proposal ke Atas", count: proposalAndUp, base: totalLeads, color: "#7c3aed" },
              { label: "Meeting Path", count: meetingPath, base: totalLeads, color: "#db2777" },
              { label: "Meeting Saat Ini", count: meetingNow, base: totalLeads, color: "#ea580c" },
              { label: "Closed (WON)", count: closedWon.length, base: totalLeads, color: "#059669" }
            ].map((item) => {
              const percent = pct(item.count, item.base);
              return (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: 12, marginBottom: 6 }}>
                    <strong>{item.label}</strong>
                    <span>{item.count.toLocaleString("id-ID")} lead - {percent}%</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${percent}%`, height: "100%", background: item.color, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
