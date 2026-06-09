import React, { useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin, User, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import type { Account, PipelineStage } from "../../shared/types";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const stageBadgeColors: Record<string, { bg: string; text: string }> = {
  "Belum Dihubungi": { bg: "#f1f5f9", text: "#475569" },
  "Chat Admin": { bg: "#fff7ed", text: "#ea580c" },
  "Chat Management": { bg: "#fffbeb", text: "#d97706" },
  "Kirim Proposal": { bg: "#f5f3ff", text: "#7c3aed" },
  "Meeting": { bg: "#fdf2f8", text: "#db2777" },
  "Negosiasi": { bg: "#fff1f2", text: "#e11d48" },
  "Kirim MOU": { bg: "#eef2ff", text: "#4f46e5" },
  "Transfer": { bg: "#ecfeff", text: "#0891b2" },
  "Closed (WON)": { bg: "#ecfdf5", text: "#059669" },
  "Ditolak": { bg: "#f8fafc", text: "#475569" }
};

interface SchedulePageProps {
  accounts: Account[];
  onOpenAccount: (account: Account) => void;
  onPatchAccount: (id: string, fields: Partial<Account>) => void;
}

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function getMonthDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function formatDateId(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  target.setHours(0, 0, 0, 0);
  return target.getTime() === today.getTime();
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export default function SchedulePage({ accounts, onOpenAccount, onPatchAccount }: SchedulePageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Account[]> = {};
    const filtered = accounts
      .filter((a) => a.meetingDate)
      .filter((a) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.owner.toLowerCase().includes(q) ||
          a.industry.toLowerCase().includes(q)
        );
      });
    for (const acc of filtered) {
      if (!map[acc.meetingDate!]) map[acc.meetingDate!] = [];
      map[acc.meetingDate!].push(acc);
    }
    return map;
  }, [accounts, searchTerm]);

  // Meetings for selected date
  const selectedMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : [];

  // Stats
  const totalMeetings = accounts.filter((a) => a.meetingDate).length;
  const todayCount = accounts.filter((a) => a.meetingDate && isToday(a.meetingDate)).length;
  const thisMonthCount = accounts.filter((a) => {
    if (!a.meetingDate) return false;
    const d = new Date(a.meetingDate + "T00:00:00");
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };
  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const getDateStr = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };

  return (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f8fafc" }}>
      {/* Top bar */}
      <header style={{
        height: "70px",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "0 24px",
        background: "#ffffff",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <CalendarDays size={20} color="#2563eb" />
          <span style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>Jadwal Meeting</span>
        </div>
        <div style={{
          height: "38px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#64748b",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "0 14px",
          maxWidth: "320px",
          width: "100%"
        }}>
          <Search size={16} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari prospek atau produk..."
            style={{ flex: 1, border: 0, background: "transparent", color: "#0f172a", fontSize: "13px", outline: 0 }}
          />
        </div>
      </header>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: "12px", padding: "16px 24px", flexShrink: 0 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 18px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Total Terjadwal</span>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{totalMeetings}</span>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 18px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Hari Ini</span>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#16a34a" }}>{todayCount}</span>
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 18px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>Bulan Ini</span>
          <span style={{ fontSize: "22px", fontWeight: "800", color: "#2563eb" }}>{thisMonthCount}</span>
        </div>
      </div>

      {/* Calendar + Detail Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "0 24px 24px", gap: "20px" }}>
        {/* Calendar Grid */}
        <div style={{
          flex: 1,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0
        }}>
          {/* Month Navigation */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff"
          }}>
            <button
              onClick={prevMonth}
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
              {MONTHS[month]} {year}
            </h3>
            <button
              onClick={nextMonth}
              style={{
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#64748b"
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc"
          }}>
            {DAYS.map((day) => (
              <div key={day} style={{
                padding: "10px 4px",
                textAlign: "center",
                fontSize: "11px",
                fontWeight: "700",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "minmax(90px, 1fr)"
          }}>
            {monthDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} style={{ background: "#fafafa", borderBottom: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }} />;
              }
              const dateStr = getDateStr(day);
              const dayMeetings = meetingsByDate[dateStr] || [];
              const isCurrentDay = isToday(dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    padding: "6px",
                    borderBottom: "1px solid #f1f5f9",
                    borderRight: "1px solid #f1f5f9",
                    cursor: "pointer",
                    background: isSelected ? "#eff6ff" : isCurrentDay ? "#fefce8" : "#ffffff",
                    transition: "background 0.15s ease",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = isCurrentDay ? "#fefce8" : "#ffffff";
                  }}
                >
                  <span style={{
                    fontSize: "12px",
                    fontWeight: isCurrentDay ? "800" : "600",
                    color: isCurrentDay ? "#d97706" : isSelected ? "#2563eb" : "#0f172a",
                    width: "24px",
                    height: "24px",
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: isCurrentDay ? "#fef3c7" : "transparent",
                    marginBottom: "2px"
                  }}>
                    {day}
                  </span>
                  <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: "2px" }}>
                    {dayMeetings.slice(0, 3).map((acc) => (
                      <div
                        key={acc.id}
                        onClick={(e) => { e.stopPropagation(); onOpenAccount(acc); }}
                        title={`${acc.name} - ${acc.owner}`}
                        style={{
                          color: "#db2777",
                          background: "#fdf2f8",
                          padding: "4px 5px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          cursor: "pointer",
                          border: "1px solid #fbcfe8",
                          lineHeight: 1.25,
                          display: "grid",
                          gap: "2px"
                        }}
                      >
                        <span style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis"
                        }}>
                          {acc.name}
                        </span>
                        <span style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          color: "#475569",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis"
                        }}>
                        </span>
                      </div>
                    ))}
                    {dayMeetings.length > 3 && (
                      <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "600", paddingLeft: "2px" }}>
                        +{dayMeetings.length - 3} lagi
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Panel */}
        <div style={{
          width: "340px",
          flexShrink: 0,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          {selectedDate ? (
            <>
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc"
              }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "600", textTransform: "uppercase" }}>
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long" })}
                </span>
                <h4 style={{ margin: "4px 0 0", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>
                  {formatDateId(selectedDate)}
                </h4>
                <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "600" }}>
                  {selectedMeetings.length} meeting
                </span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                {selectedMeetings.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 16px", fontSize: "13px" }}>
                    <CalendarDays size={36} color="#cbd5e1" style={{ margin: "0 auto 12px" }} />
                    <p style={{ margin: 0 }}>Tidak ada meeting di tanggal ini</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedMeetings.map((acc) => {
                      const sBadge = stageBadgeColors[acc.stage] ?? stageBadgeColors["Belum Dihubungi"];
                      return (
                        <div
                          key={acc.id}
                          onClick={() => onOpenAccount(acc)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "12px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1";
                            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
                            (e.currentTarget as HTMLElement).style.boxShadow = "none";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                            <strong style={{ fontSize: "13px", color: "#0f172a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {acc.name}
                            </strong>
                            <span style={{
                              fontSize: "9px",
                              fontWeight: "700",
                              color: sBadge.text,
                              background: sBadge.bg,
                              padding: "2px 6px",
                              borderRadius: "10px",
                              flexShrink: 0
                            }}>
                              {acc.stage}
                            </span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#64748b" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MapPin size={11} /> {acc.location || "—"}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: "600", color: "#0f172a" }}>
                              {rupiah.format(acc.dealValue ?? 0)}
                            </span>
                          </div>
                          <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpenAccount(acc); }}
                              style={{
                                border: "1px solid #e2e8f0",
                                background: "#ffffff",
                                borderRadius: "6px",
                                width: "28px",
                                height: "28px",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                                color: "#64748b"
                              }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 20px", fontSize: "13px" }}>
              <CalendarDays size={48} color="#cbd5e1" style={{ margin: "0 auto 16px" }} />
              <p style={{ fontWeight: "600", color: "#64748b", fontSize: "15px", margin: "0 0 6px" }}>Pilih Tanggal</p>
              <p style={{ margin: 0 }}>Klik tanggal di kalender untuk melihat detail meeting.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
