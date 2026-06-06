import React, { useState } from "react";
import { Search, Play, HelpCircle, Loader2, Sparkles, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import type { AiResearchJob, ProspectOwner } from "../../shared/types";

interface ResearchDashboardProps {
  jobs: AiResearchJob[];
  team: ProspectOwner[];
  onStartResearch: (input: {
    query: string;
    requestedBy: ProspectOwner;
    googlePlacesApiKey?: string;
    limit: number;
  }) => Promise<void>;
  busy: boolean;
}

export default function ResearchDashboard({
  jobs,
  team,
  onStartResearch,
  busy
}: ResearchDashboardProps) {
  const [query, setQuery] = useState("");
  const [requestedBy, setRequestedBy] = useState<ProspectOwner>(team[0] ?? "Daus");
  const [apiKey, setApiKey] = useState("");
  const [limit, setLimit] = useState(10);
  const [showKeyHelp, setShowKeyHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await onStartResearch({
      query: query.trim(),
      requestedBy,
      googlePlacesApiKey: apiKey.trim() || undefined,
      limit
    });
    setQuery("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 size={16} className="statusDone" />;
      case "failed":
        return <AlertTriangle size={16} className="statusFailed" />;
      default:
        return <Loader2 size={16} className="statusRunning" />;
    }
  };

  return (
    <section className="researchDashboardPage">
      <header className="pageHeader">
        <div>
          <h2>AI Lead Researcher</h2>
          <p>Mencari leads secara masal dari Google Places API dan mengelompokkannya secara otomatis berdasarkan tipe bisnis.</p>
        </div>
      </header>

      <div className="researchGrid">
        {/* Launcher Panel */}
        <div className="launcherCard">
          <h3><Sparkles size={18} className="purpleGlow" /> Cari Prospek Baru</h3>
          <form onSubmit={handleSubmit} className="launcherForm">
            <label>
              Kata Kunci Pencarian (Query)
              <input
                type="text"
                required
                placeholder="Contoh: skincare bandung, travel umroh jakarta"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={busy}
              />
              <small>Gunakan kombinasi tipe bisnis + nama kota untuk hasil optimal.</small>
            </label>

            <div className="formRow">
              <label>
                Pemohon (PIC)
                <select
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value as ProspectOwner)}
                  disabled={busy}
                >
                  {team.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Jumlah Maksimal Hasil
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={busy}
                >
                  <option value={5}>5 leads</option>
                  <option value={10}>10 leads</option>
                  <option value={15}>15 leads</option>
                  <option value={20}>20 leads</option>
                </select>
              </label>
            </div>

            <label className="keyLabel">
              <div className="keyLabelTitle">
                <span>Google Places API Key (Opsional)</span>
                <HelpCircle size={14} className="helpIcon" onClick={() => setShowKeyHelp(!showKeyHelp)} />
              </div>
              <input
                type="password"
                placeholder="Kosongkan untuk memakai simulator / env server"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={busy}
              />
              {showKeyHelp && (
                <div className="helpBox">
                  Jika dikosongkan, sistem akan otomatis menggunakan API Key yang terpasang di file <code>.env</code> server. Apabila server juga tidak memiliki API Key, sistem akan masuk ke <strong>Simulator Mode</strong> yang menghasilkan draf data simulasi realistis untuk kebutuhan demo/uji coba.
                </div>
              )}
            </label>

            <button type="submit" className="launchBtn" disabled={busy || !query.trim()}>
              {busy ? (
                <>
                  <Loader2 size={18} className="spinner" /> Melakukan Riset...
                </>
              ) : (
                <>
                  <Play size={18} /> Jalankan AI Research
                </>
              )}
            </button>
          </form>
        </div>

        {/* Audit Log Panel */}
        <div className="jobLogsCard">
          <h3>Riwayat AI Research</h3>
          <div className="logsContainer">
            {jobs.map((job) => (
              <div className="logItem" key={job.id}>
                <div className="logHeader">
                  <div className="logTitleSection">
                    {getStatusIcon(job.status)}
                    <span className="logQuery">{job.query}</span>
                  </div>
                  <span className="logDate">
                    {new Date(job.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                <div className="logBody">
                  <div className="logMeta">
                    <span>PIC: {job.requestedBy}</span>
                    <span>•</span>
                    <span>Provider: {job.provider === "google_places" ? "Google Places" : "Simulator"}</span>
                  </div>
                  
                  {job.status === "done" && (
                    <div className="logResults">
                      <span className="resFound">Ditemukan: {job.found}</span>
                      <span className="resValid">Valid: {job.valid}</span>
                      <span className="resDup">Duplikat: {job.duplicates}</span>
                    </div>
                  )}

                  {job.error && (
                    <p className="logErrorText">Error: {job.error}</p>
                  )}

                  {job.notes && (
                    <p className="logNotes"><FileText size={12} /> {job.notes}</p>
                  )}
                </div>
              </div>
            ))}

            {jobs.length === 0 && (
              <div className="logsEmptyState">Belum ada riset yang dijalankan.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
