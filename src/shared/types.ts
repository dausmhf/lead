export type AccountType = "B2B" | "B2G" | "B2P" | "B2COM";
export type BudgetClass = "Rendah" | "Menengah" | "Tinggi";
export type PipelineStage =
  | "Belum Dihubungi"
  | "Chat Admin"
  | "Chat Management"
  | "Kirim Proposal"
  | "Meeting"
  | "Negosiasi"
  | "Kirim MOU"
  | "Transfer"
  | "Closed (WON)"
  | "Ditolak";

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
  email?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  googleBusinessProfile?: string;
  ownerName?: string;
  ownerInstagram?: string;
  ownerPhone?: string;
  ownerFacebook?: string;
  ownerLinkedin?: string;
  ownerEmail?: string;
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

export type WhatsAppProvider = "mock" | "starsender" | "waba";
export type WhatsAppMessageDirection = "outbound" | "inbound";
export type WhatsAppMessageStatus = "draft" | "queued" | "sent" | "delivered" | "read" | "failed";
export type WhatsAppLeadSignal =
  | "cold"
  | "warm"
  | "hot"
  | "ask_price"
  | "meeting"
  | "rejected"
  | "not_valid"
  | "unknown";

export interface WhatsAppSettings {
  provider: WhatsAppProvider;
  enabled: boolean;
  starsenderApiKey?: string;
  starsenderBaseUrl?: string;
  wabaAccessToken?: string;
  wabaPhoneNumberId?: string;
  updatedAt?: string;
}

export interface WhatsAppContact {
  id: string;
  phone: string;
  name?: string;
  accountId?: string;
  classification: WhatsAppLeadSignal;
  status: "new" | "screened" | "linked" | "ignored";
  notes?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WhatsAppMessage {
  id: string;
  accountId?: string;
  contactPhone: string;
  to: string;
  from?: string;
  body: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  provider: WhatsAppProvider;
  signal: WhatsAppLeadSignal;
  externalId?: string;
  error?: string;
  raw?: unknown;
  createdAt: string;
}

export type WhatsAppFollowUpStatus = "pending" | "sent" | "skipped" | "failed";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "first_touch" | "follow_up" | "pricing" | "meeting" | "nurture";
  body: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface WhatsAppFollowUpTask {
  id: string;
  accountId?: string;
  contactPhone: string;
  templateId?: string;
  title: string;
  body: string;
  status: WhatsAppFollowUpStatus;
  dueAt: string;
  sentMessageId?: string;
  error?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CrmDatabase {
  accounts: Account[];
  offers: Offer[];
  opportunities: Opportunity[];
  aiResearchJobs: AiResearchJob[];
  leadFindings: LeadFinding[];
  syncTarget: SyncTarget;
  syncRuns: SyncRun[];
  whatsappSettings: WhatsAppSettings;
  whatsappContacts: WhatsAppContact[];
  whatsappMessages: WhatsAppMessage[];
  whatsappTemplates: WhatsAppTemplate[];
  whatsappFollowUps: WhatsAppFollowUpTask[];
}
