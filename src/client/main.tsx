import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Search,
  Settings,
  X,
  Plus,
  LayoutDashboard,
  CalendarCheck,
  Lock,
  LogOut,
  MessageCircle,
  Loader2
} from "lucide-react";
import type { 
  Account, 
  Offer, 
  Opportunity, 
  PipelineStage, 
  ProspectOwner, 
  LeadFinding, 
  SyncTarget, 
  SyncRun,
  WhatsAppSettings
} from "../shared/types";
import "./styles.css";

// Lazy-loaded tab components (code splitting)
const DealsPage = lazy(() => import("./components/DealsPage"));
const LeadsSearch = lazy(() => import("./components/LeadsSearch"));
const SettingsPage = lazy(() => import("./components/SettingsPage"));
const CrmDashboard = lazy(() => import("./components/CrmDashboard"));
const SchedulePage = lazy(() => import("./components/SchedulePage"));
const WhatsappInbox = lazy(() => import("./components/WhatsappInbox"));

// DetailPanel tetap eager — sering dipakai di semua tab
import DetailPanel from "./components/DetailPanel";

function TabFallback() {
  return <div style={{ display: "grid", placeItems: "center", height: "60vh", color: "#94a3b8" }}><Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} /></div>;
}


interface Summary {
  totalLead: number;
  prospectLead: number;
  chat_managementLead: number;
  onBrief: number;
  meetingScheduled: number;
  proposalSent: number;
  closedWon: number;
  totalPotentialDeal: number;
  projectedRevenue: number;
  team: string[];
}

interface Filters {
  owners: ProspectOwner[];
  cities: string[];
  industries: string[];
  stages: PipelineStage[];
}

type ManualLead = {
  name: string;
  phone: string;
  industry: string;
  location: string;
  owner: ProspectOwner;
  offerMatch: string;
  stage: PipelineStage;
  website: string;
  instagram: string;
  email: string;
  tiktok: string;
  facebook: string;
  linkedin: string;
  googleBusinessProfile: string;
  ownerName: string;
  ownerInstagram: string;
  ownerPhone: string;
  ownerFacebook: string;
  ownerLinkedin: string;
  ownerEmail: string;
  nextAction: string;
};

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
const templateHeaders = [
  "name",
  "phone",
  "industry",
  "location",
  "pic",
  "closing_product",
  "stage",
  "website",
  "instagram",
  "email",
  "tiktok",
  "facebook",
  "linkedin",
  "google_business_profile",
  "owner_name",
  "owner_instagram",
  "owner_phone",
  "owner_facebook",
  "owner_linkedin",
  "owner_email",
  "next_action",
  "notes"
];

function productOptions(offers: Offer[]) {
  return [...new Set(["Website Company Profile", "Landing Page Conversion", "Website Toko Online", "Maintenance Website", ...offers.map((offer) => offer.name)])];
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
});

const navTabs = ["dashboard", "deals", "leads", "whatsapp", "schedule", "settings"] as const;
type NavTab = typeof navTabs[number];
const activeTabStorageKey = "lead-website.activeTab";

interface AuthUser {
  email: string;
  role: "admin";
}

function getInitialActiveTab(): NavTab {
  const hashTab = window.location.hash.replace("#", "");
  if (navTabs.includes(hashTab as NavTab)) return hashTab as NavTab;

  const savedTab = window.localStorage.getItem(activeTabStorageKey);
  if (navTabs.includes(savedTab as NavTab)) return savedTab as NavTab;

  return "dashboard";
}

function App() {
  const [authStatus, setAuthStatus] = useState<"checking" | "authenticated" | "guest">("checking");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [findings, setFindings] = useState<LeadFinding[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [syncTarget, setSyncTarget] = useState<SyncTarget | null>(null);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialActiveTab);
  const [activeView, setActiveView] = useState("all");
  
  // Filter inputs
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [owner, setOwner] = useState("");
  
  // Selection/Expansion states
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [compact, setCompact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("x-csrf-token", csrfToken);
    }
    return fetch(input, { ...init, headers, credentials: "same-origin" });
  }

  async function loadData() {
    try {
      const [
        accountsRes, 
        offersRes, 
        opportunitiesRes, 
        summaryRes, 
        filtersRes,
        findingsRes,
        jobsRes,
        syncTargetRes,
        syncRunsRes,
        whatsappSettingsRes
      ] = await Promise.all([
        apiFetch("/api/accounts"),
        apiFetch("/api/offers"),
        apiFetch("/api/opportunities"),
        apiFetch("/api/summary"),
        apiFetch("/api/filters"),
        apiFetch("/api/lead-findings"),
        apiFetch("/api/ai/research-jobs"),
        apiFetch("/api/sync/target"),
        apiFetch("/api/sync/runs"),
        apiFetch("/api/whatsapp/settings")
      ]);
      if (accountsRes.status === 401) {
        setAuthStatus("guest");
        setAuthUser(null);
        return;
      }
      const accountsPayload = await accountsRes.json();
      setAccounts(Array.isArray(accountsPayload) ? accountsPayload : (accountsPayload.data ?? []));
      setOffers(await offersRes.json());
      setOpportunities(await opportunitiesRes.json());
      setSummary(await summaryRes.json());
      setFilters(await filtersRes.json());
      setFindings(await findingsRes.json());
      setJobs(await jobsRes.json());
      setSyncTarget(await syncTargetRes.json());
      setSyncRuns(await syncRunsRes.json());
      setWhatsappSettings(await whatsappSettingsRes.json());
    } catch (error) {
      console.error("Error loading CRM database:", error);
    }
  }

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "same-origin" });
        if (!response.ok) {
          setAuthStatus("guest");
          return;
        }
        const data = await response.json();
        setAuthUser(data.user);
        setCsrfToken(data.csrfToken);
        setAuthStatus("authenticated");
      } catch {
        setAuthStatus("guest");
      }
    }
    void checkAuth();
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated" && csrfToken) {
      void loadData();
    }
  }, [authStatus, csrfToken]);

  useEffect(() => {
    window.localStorage.setItem(activeTabStorageKey, activeTab);
    if (window.location.hash !== `#${activeTab}`) {
      window.history.replaceState(null, "", `#${activeTab}`);
    }
  }, [activeTab]);

  async function patchAccount(id: string, fields: Partial<Account>) {
    setBusy(true);
    try {
      const response = await apiFetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields)
      });
      const updated = await response.json();
      setAccounts((prev) => prev.map((account) => account.id === id ? updated : account));
      setSelectedAccount((prev) => prev?.id === id ? updated : prev);
      await loadData();
    } catch (e) {
      console.error("Error updating account:", e);
    } finally {
      setBusy(false);
    }
  }

  async function bulkUpdate(fields: Partial<Account>) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      await apiFetch("/api/accounts/batch-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: Array.from(selectedIds), ...fields })
      });
      setSelectedIds(new Set());
      await loadData();
    } catch (e) {
      console.error("Error bulk updating:", e);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(id: string) {
    const account = accounts.find((item) => item.id === id);
    if (!window.confirm(`Delete prospek ${account?.name ?? "ini"}?`)) return;
    setBusy(true);
    try {
      const response = await apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal menghapus prospek");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setSelectedAccount((prev) => prev?.id === id ? null : prev);
      await loadData();
    } catch (e) {
      console.error("Error deleting account:", e);
    } finally {
      setBusy(false);
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} prospek terpilih?`)) return;
    setBusy(true);
    try {
      const response = await apiFetch("/api/accounts/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds: Array.from(selectedIds) })
      });
      if (!response.ok) throw new Error("Gagal menghapus prospek terpilih");
      setSelectedIds(new Set());
      setSelectedAccount(null);
      await loadData();
    } catch (e) {
      console.error("Error bulk deleting accounts:", e);
    } finally {
      setBusy(false);
    }
  }

  async function createManualLead(lead: ManualLead) {
    setBusy(true);
    try {
      await apiFetch("/api/inbox/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: lead.name,
          phone: lead.phone,
          industry: lead.industry,
          location: lead.location,
          owner: lead.owner,
          offerMatch: lead.offerMatch ? [lead.offerMatch] : [],
          stage: lead.stage,
          website: lead.website || undefined,
          instagram: lead.instagram || undefined,
          email: lead.email || undefined,
          tiktok: lead.tiktok || undefined,
          facebook: lead.facebook || undefined,
          linkedin: lead.linkedin || undefined,
          googleBusinessProfile: lead.googleBusinessProfile || undefined,
          ownerName: lead.ownerName || undefined,
          ownerInstagram: lead.ownerInstagram || undefined,
          ownerPhone: lead.ownerPhone || undefined,
          ownerFacebook: lead.ownerFacebook || undefined,
          ownerLinkedin: lead.ownerLinkedin || undefined,
          ownerEmail: lead.ownerEmail || undefined,
          nextAction: lead.nextAction || "Review prospek dan siapkan langkah berikutnya.",
          source: "Manual Input"
        })
      });
      setManualOpen(false);
      await loadData();
    } catch (e) {
      console.error("Error creating manual lead:", e);
    } finally {
      setBusy(false);
    }
  }

  async function importXlsx(file: File) {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      
      const validStages: PipelineStage[] = [
        "Belum Dihubungi", "Chat Admin", "Chat Management", "Kirim Proposal", "Meeting",
        "Negosiasi", "Kirim MOU", "Transfer", "Closed (WON)", "Ditolak"
      ];
      const stageMap: Record<string, PipelineStage> = {
        "prospek": "Belum Dihubungi",
        "chat admin": "Chat Admin",
        "chat_admin": "Chat Admin",
        "admin": "Chat Admin",
        "potensial": "Chat Management",
        "chat_management": "Chat Management",
        "chat management": "Chat Management",
        "on brief": "Kirim Proposal",
        "brief sent": "Kirim Proposal",
        "tahap briefing": "Kirim Proposal",
        "meeting": "Meeting",
        "negotiation": "Negosiasi",
        "negosiasi": "Negosiasi",
        "proposal": "Kirim Proposal",
        "kirim proposal": "Kirim Proposal",
        "mou": "Kirim MOU",
        "kirim mou": "Kirim MOU",
        "transfer": "Transfer",
        "closed won": "Closed (WON)",
        "closed won (deal)": "Closed (WON)",
        "closed (won)": "Closed (WON)",
        "nurture": "Ditolak",
        "nurturing": "Ditolak",
        "ditolak": "Ditolak"
      };

      const leads = rows
        .map((row) => {
          const rawStage = String(row.stage ?? "").trim();
          let matchedStage: PipelineStage = "Belum Dihubungi";
          if (rawStage) {
            const lowerStage = rawStage.toLowerCase();
            if (validStages.includes(rawStage as PipelineStage)) {
              matchedStage = rawStage as PipelineStage;
            } else if (stageMap[lowerStage]) {
              matchedStage = stageMap[lowerStage];
            }
          }
          return {
            name: String(row.name ?? row.brand ?? row.business_name ?? "").trim(),
            phone: String(row.phone ?? row.nomor_hp ?? row.hp ?? "").trim(),
            industry: String(row.industry ?? row.category ?? "").trim() || "Belum diklasifikasi",
            location: String(row.location ?? row.city ?? row.kota ?? "").trim() || "Indonesia",
            owner: String(row.pic ?? row.owner ?? "Daus").trim(),
            offerMatch: String(row.closing_product ?? row.product ?? row.offer ?? "").trim(),
            stage: matchedStage,
            website: String(row.website ?? "").trim(),
            instagram: String(row.instagram ?? row.ig ?? "").trim(),
            email: String(row.email ?? "").trim(),
            tiktok: String(row.tiktok ?? "").trim(),
            facebook: String(row.facebook ?? row.fb ?? "").trim(),
            linkedin: String(row.linkedin ?? "").trim(),
            googleBusinessProfile: String(row.google_business_profile ?? row.gbp ?? "").trim(),
            ownerName: String(row.owner_name ?? row.ownerName ?? "").trim(),
            ownerInstagram: String(row.owner_instagram ?? row.ownerInstagram ?? "").trim(),
            ownerPhone: String(row.owner_phone ?? row.ownerPhone ?? "").trim(),
            ownerFacebook: String(row.owner_facebook ?? row.ownerFacebook ?? "").trim(),
            ownerLinkedin: String(row.owner_linkedin ?? row.ownerLinkedin ?? "").trim(),
            ownerEmail: String(row.owner_email ?? row.ownerEmail ?? "").trim(),
            nextAction: String(row.next_action ?? "").trim(),
            notes: String(row.notes ?? "").trim()
          };
        })
        .filter((lead) => lead.name);

      await apiFetch("/api/inbox/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leads.map((lead) => ({
            ...lead,
            owner: (filters?.owners.includes(lead.owner as ProspectOwner) ? lead.owner : "Daus") as ProspectOwner,
            offerMatch: lead.offerMatch ? [lead.offerMatch] : [],
            source: "XLSX Import"
          }))
        })
      });
      await loadData();
    } catch (e) {
      console.error("Error importing XLSX:", e);
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const example = {
      name: "Bisnis Contoh",
      phone: "6281234567890",
      industry: "Bisnis Lokal",
      location: "Jakarta",
      pic: "Daus",
      closing_product: "Website Company Profile",
      stage: "Belum Dihubungi",
      website: "https://example.com",
      instagram: "@brandcontoh",
      email: "admin@example.com",
      tiktok: "@brandcontoh",
      facebook: "https://facebook.com/brandcontoh",
      linkedin: "https://linkedin.com/company/brandcontoh",
      google_business_profile: "https://maps.google.com/...",
      owner_name: "Nama Owner",
      owner_instagram: "@owner",
      owner_phone: "6281234567890",
      owner_facebook: "",
      owner_linkedin: "",
      owner_email: "owner@example.com",
      next_action: "Review website lama dan follow up WhatsApp",
      notes: "Catatan opsional"
    };
    const sheet = XLSX.utils.json_to_sheet([example], { header: templateHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Prospects");
    XLSX.writeFile(workbook, "lead-website-template.xlsx");
  }

  // AI & integration actions
  async function handleApproveFinding(id: string) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/lead-findings/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menyetujui temuan");
      await loadData();
    } catch (e) {
      console.error("Error approving lead finding:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectFinding(id: string) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/lead-findings/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Gagal menolak temuan");
      await loadData();
    } catch (e) {
      console.error("Error rejecting lead finding:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleStartResearch(input: {
    query: string;
    requestedBy: ProspectOwner;
    googlePlacesApiKey?: string;
    limit: number;
  }) {
    setBusy(true);
    try {
      const res = await apiFetch("/api/ai/research-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!res.ok) throw new Error("Gagal memulai riset");
      await loadData();
    } catch (e) {
      console.error("Error running research:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSyncTarget(target: { endpointUrl: string; authHeader?: string; enabled: boolean }) {
    setBusy(true);
    try {
      const res = await apiFetch("/api/sync/target", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target)
      });
      if (!res.ok) throw new Error("Gagal menyimpan konfigurasi target");
      await loadData();
    } catch (e) {
      console.error("Error saving sync target:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveWhatsAppSettings(settings: WhatsAppSettings) {
    setBusy(true);
    try {
      const res = await apiFetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Gagal menyimpan konfigurasi WhatsApp");
      setWhatsappSettings(await res.json());
      await loadData();
    } catch (e) {
      console.error("Error saving WhatsApp settings:", e);
    } finally {
      setBusy(false);
    }
  }

  async function handleTriggerSync(dryRun: boolean): Promise<SyncRun> {
    setBusy(true);
    try {
      const res = await apiFetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun })
      });
      if (!res.ok) throw new Error("Gagal melakukan push sync");
      const run: SyncRun = await res.json();
      await loadData();
      return run;
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(email: string, password: string): Promise<string | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) return data.error ?? "Login gagal.";

      setAuthUser(data.user);
      setCsrfToken(data.csrfToken);
      setAuthStatus("authenticated");
      return null;
    } catch {
      return "Server login belum siap. Coba jalankan ulang dev server.";
    }
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setCsrfToken("");
    setAuthStatus("guest");
    setAccounts([]);
    setOffers([]);
    setOpportunities([]);
    setFindings([]);
    setJobs([]);
    setSyncRuns([]);
    setWhatsappSettings(null);
    setSummary(null);
    setFilters(null);
  }

  if (authStatus === "checking") {
    return (
      <div className="authShell">
        <div className="authCard">
          <div className="authMark"><Lock size={18} /></div>
          <h1>Memeriksa sesi</h1>
          <p>Dashboard lead sedang memastikan akses aman.</p>
        </div>
      </div>
    );
  }

  if (authStatus === "guest") {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="leadApp">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        summary={summary} 
        user={authUser}
        onLogout={handleLogout}
      />
      <main className="leadMain">
        <Suspense fallback={<TabFallback />}>
        {activeTab === "dashboard" && (
          <CrmDashboard
            accounts={accounts}
            offers={offers}
          />
        )}
        
        {activeTab === "deals" && (
          <DealsPage
            accounts={accounts}
            offers={offers}
            opportunities={opportunities}
            summary={summary}
            onCreateDeal={() => setManualOpen(true)}
            onOpenAccount={(acc) => setSelectedAccount(acc)}
            onUpdateStage={(id, stage) => patchAccount(id, { stage })}
          />
        )}
        
        {activeTab === "leads" && (
          <LeadsSearch
            accounts={accounts}
            offers={offers}
            filters={filters}
            search={search}
            setSearch={setSearch}
            city={city}
            setCity={setCity}
            industry={industry}
            setIndustry={setIndustry}
            owner={owner}
            setOwner={setOwner}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            compact={compact}
            setCompact={setCompact}
            busy={busy}
            onImportXlsx={importXlsx}
            onDownloadTemplate={downloadTemplate}
            onAddManualLead={() => setManualOpen(true)}
            onOpenAccount={(acc) => setSelectedAccount(acc)}
            onPatchAccount={patchAccount}
            onDeleteAccount={deleteAccount}
            onBulkUpdate={bulkUpdate}
            onBulkDelete={bulkDelete}
            activeView={activeView}
            setActiveView={setActiveView}
          />
        )}

        {activeTab === "schedule" && (
          <SchedulePage
            accounts={accounts}
            onOpenAccount={(acc) => setSelectedAccount(acc)}
            onPatchAccount={patchAccount}
          />
        )}

        {activeTab === "whatsapp" && (
          <WhatsappInbox
            accounts={accounts}
            apiFetch={apiFetch}
            onOpenAccount={(acc) => setSelectedAccount(acc)}
            onDataChanged={loadData}
          />
        )}

        {activeTab === "settings" && (
          <SettingsPage
            offers={offers}
            syncTarget={syncTarget}
            syncRuns={syncRuns}
            whatsappSettings={whatsappSettings}
            onSaveTarget={handleSaveSyncTarget}
            onSaveWhatsAppSettings={handleSaveWhatsAppSettings}
            onTriggerSync={handleTriggerSync}
            busy={busy}
          />
        )}
        </Suspense>

        {selectedAccount && (
          <>
            <div className="panelBackdrop" onClick={() => setSelectedAccount(null)} />
            <DetailPanel
              account={selectedAccount}
              offers={offers}
              pics={filters?.owners ?? ["Daus"]}
              apiFetch={apiFetch}
              onClose={() => setSelectedAccount(null)}
              onPatch={(fields) => patchAccount(selectedAccount.id, fields)}
              onAfterWhatsAppSend={loadData}
            />
          </>
        )}

        {manualOpen && (
          <ManualLeadModal
            offers={offers}
            pics={filters?.owners ?? ["Daus"]}
            onClose={() => setManualOpen(false)}
            onSave={createManualLead}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({ 
  activeTab, 
  setActiveTab, 
  summary,
  user,
  onLogout
}: { 
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  summary: Summary | null;
  user: AuthUser | null;
  onLogout: () => void;
}) {
  const menu: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "deals", label: "Pipeline Deals", icon: CalendarDays },
    { id: "leads", label: "Database Prospek", icon: Search },
    { id: "whatsapp", label: "WA Inbox", icon: MessageCircle },
    { id: "schedule", label: "Jadwal Meeting", icon: CalendarCheck },
    { id: "settings", label: "Integrasi & API", icon: Settings }
  ];

  return (
    <aside className="darkSidebar">
      <div className="sidebarLogo">
        <div className="logoMark">D</div>
        <div>
          <h1>Daus Lead</h1>
          <p>Website Prospect</p>
        </div>
      </div>
      <nav className="sidebarMenu">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <button 
              key={item.id} 
              className={activeTab === item.id ? "active" : ""} 
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebarStats">
        <div><span>Total Prospek</span><b>{summary?.totalLead ?? 0}</b></div>
        <div><span>Peluang Aktif</span><b className="blueText">{summary ? summary.totalLead - summary.closedWon : 0}</b></div>
        <div><span>Total Revenue</span><b className="greenText">{rupiah.format(summary?.totalPotentialDeal ?? 0)}</b></div>
        <div><span>Closed (WON)</span><b className="greenText">{summary?.closedWon ?? 0}</b></div>
      </div>
      <div className="sidebarAuth">
        <div>
          <span>Admin</span>
          <strong>{user?.email ?? "dausmhf@gmail.com"}</strong>
        </div>
        <button onClick={onLogout} title="Logout">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("dausmhf@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const loginError = await onLogin(email, password);
    if (loginError) setError(loginError);
    setLoading(false);
  }

  return (
    <section className="authShell">
      <form className="authCard" onSubmit={submit}>
        <div className="authMark"><Lock size={20} /></div>
        <h1>Login CRM</h1>
        <p>Akses dashboard personal prospek website.</p>

        <label>
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            inputMode="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="authError">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Memeriksa..." : "Masuk"}
        </button>
      </form>
    </section>
  );
}


function ManualLeadModal({ 
  offers, 
  pics, 
  onClose, 
  onSave 
}: {
  offers: Offer[];
  pics: ProspectOwner[];
  onClose: () => void;
  onSave: (lead: ManualLead) => void;
}) {
  const [lead, setLead] = useState<ManualLead>({
    name: "",
    phone: "",
    industry: "",
    location: "",
    owner: pics[0] ?? "Daus",
    offerMatch: "",
    stage: "Belum Dihubungi",
    website: "",
    instagram: "",
    email: "",
    tiktok: "",
    facebook: "",
    linkedin: "",
    googleBusinessProfile: "",
    ownerName: "",
    ownerInstagram: "",
    ownerPhone: "",
    ownerFacebook: "",
    ownerLinkedin: "",
    ownerEmail: "",
    nextAction: ""
  });

  function setField<K extends keyof ManualLead>(key: K, value: ManualLead[K]) {
    setLead((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="modalBackdrop">
      <section className="manualModal">
        <div className="detailHeader">
          <div>
            <span>Manual Input</span>
            <h2>Tambah Prospek Baru</h2>
          </div>
          <button onClick={onClose} className="iconOnly borderBtn"><X size={18} /></button>
        </div>
        <div className="manualGrid">
          <label>Nama Brand / Bisnis<input value={lead.name} onChange={(event) => setField("name", event.target.value)} /></label>
          <label>Nomor HP / WhatsApp<input value={lead.phone} onChange={(event) => setField("phone", event.target.value)} placeholder="Contoh: 628..." /></label>
          <label>Kategori Industri<input value={lead.industry} onChange={(event) => setField("industry", event.target.value)} /></label>
          <label>Kota<input value={lead.location} onChange={(event) => setField("location", event.target.value)} /></label>
          <label>
            Owner
            <select value={lead.owner} onChange={(event) => setField("owner", event.target.value as ProspectOwner)}>
              {pics.map((pic) => <option key={pic} value={pic}>{pic}</option>)}
            </select>
          </label>
          <label>
            Rekomendasi Produk
            <select value={lead.offerMatch} onChange={(event) => setField("offerMatch", event.target.value)}>
              <option value="">Pilih Produk</option>
              {productOptions(offers).map((product) => <option key={product} value={product}>{product}</option>)}
            </select>
          </label>
          <label>
            Status Pipeline
            <select value={lead.stage} onChange={(event) => setField("stage", event.target.value as PipelineStage)}>
              {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label>Website URL<input value={lead.website} onChange={(event) => setField("website", event.target.value)} placeholder="https://..." /></label>
          <label>Instagram Handle<input value={lead.instagram} onChange={(event) => setField("instagram", event.target.value)} placeholder="@brand" /></label>
          <label>TikTok Handle<input value={lead.tiktok} onChange={(event) => setField("tiktok", event.target.value)} placeholder="@brand" /></label>
          <label className="wideField">Google Business Profile URL<input value={lead.googleBusinessProfile} onChange={(event) => setField("googleBusinessProfile", event.target.value)} placeholder="https://maps.google.com/..." /></label>
          <label className="wideField">Langkah Selanjutnya (Next Action)<input value={lead.nextAction} onChange={(event) => setField("nextAction", event.target.value)} placeholder="Hubungi WhatsApp, siapkan presentasi, dll." /></label>
        </div>
        <div className="modalActions">
          <button className="ghostBtn" onClick={onClose}>Batal</button>
          <button 
            className="primaryBtn" 
            onClick={() => onSave(lead)} 
            disabled={!lead.name || !lead.phone}
          >
            Simpan Prospek
          </button>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
