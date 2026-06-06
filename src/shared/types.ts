export type AccountType = "B2B" | "B2G" | "B2P" | "B2COM";
export type BudgetClass = "Rendah" | "Menengah" | "Tinggi";
export type PipelineStage =
  | "Belum Dihubungi"
  | "Potensial"
  | "Tahap Briefing"
  | "Meeting"
  | "Negosiasi"
  | "Kirim Proposal"
  | "Closed Won (Deal)"
  | "Nurturing";

export type ProspectOwner = "Daus";
export type FindingStatus = "pending" | "approved" | "rejected" | "synced";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  industry: string;
  location: string;
  website?: string;
  instagram?: string;
  phone?: string;
  tiktok?: string;
  googleBusinessProfile?: string;
  audienceSize: number;
  budgetClass: BudgetClass;
  decisionMaker: string;
  problemHypothesis: string;
  offerMatch: string[];
  priorityScore: number;
  dealValue: number;
  stage: PipelineStage;
  owner: ProspectOwner;
  source?: string;
  externalId?: string;
  notes?: string;
  nextAction?: string;
  briefStatus?: "Belum Brief" | "On Brief" | "Brief Sent" | "Revisi Brief" | "Deal Brief";
  lastContactAt?: string;
  meetingDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Offer {
  id: string;
  productLine: "Community" | "Media" | "Program";
  name: string;
  targetMarket: string[];
  pricingNote: string;
  pricePerProspect?: number;
  packagePrice?: number;
  deliverables: string[];
}

export interface Opportunity {
  id: string;
  accountId: string;
  offerId: string;
  stage: PipelineStage;
  dealValue: number;
  probability: number;
  expectedCloseDate: string;
  source: string;
  owner: ProspectOwner;
  nextAction: string;
}

export interface AiResearchJob {
  id: string;
  query: string;
  status: "queued" | "running" | "done" | "failed";
  requestedBy: ProspectOwner;
  found: number;
  valid: number;
  duplicates: number;
  createdAt: string;
  finishedAt?: string;
  notes: string;
  provider: "mock" | "google_places" | "manual";
  error?: string;
}

export interface LeadFinding {
  id: string;
  jobId: string;
  name: string;
  type: AccountType;
  industry: string;
  location: string;
  website?: string;
  phone?: string;
  address?: string;
  googlePlaceId?: string;
  rating?: number;
  userRatingsTotal?: number;
  source: "Google Places" | "Manual" | "Mock Research";
  reasonFit: string;
  problemHypothesis: string;
  offerMatch: string[];
  priorityScore: number;
  owner: ProspectOwner;
  status: FindingStatus;
  createdAt: string;
  syncedAt?: string;
}

export interface SyncTarget {
  endpointUrl: string;
  authHeader?: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface SyncRun {
  id: string;
  status: "success" | "failed" | "dry_run";
  targetUrl: string;
  accountCount: number;
  findingCount: number;
  createdAt: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

export interface CrmDatabase {
  accounts: Account[];
  offers: Offer[];
  opportunities: Opportunity[];
  aiResearchJobs: AiResearchJob[];
  leadFindings: LeadFinding[];
  syncTarget: SyncTarget;
  syncRuns: SyncRun[];
}
