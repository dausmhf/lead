import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Account, CrmDatabase, LeadFinding, Opportunity, SyncRun, SyncTarget } from "../../shared/types";
import { accounts, aiResearchJobs, offers, opportunities } from "./seed";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "crm-db.json");

function initialDatabase(): CrmDatabase {
  return {
    accounts,
    offers,
    opportunities,
    aiResearchJobs,
    leadFindings: [],
    syncTarget: {
      endpointUrl: process.env.CRM_PUSH_ENDPOINT ?? "",
      authHeader: process.env.CRM_PUSH_AUTH_HEADER ?? "",
      enabled: Boolean(process.env.CRM_PUSH_ENDPOINT)
    },
    syncRuns: [],
    whatsappSettings: {
      provider: "mock",
      enabled: false,
      starsenderBaseUrl: process.env.STARSENDER_BASE_URL ?? "https://api.starsender.online/api"
    },
    whatsappContacts: [],
    whatsappMessages: []
  };
}

function normalizeDatabase(db: Partial<CrmDatabase>): CrmDatabase {
  const base = initialDatabase();
  return {
    ...base,
    ...db,
    accounts: db.accounts ?? base.accounts,
    offers: db.offers ?? base.offers,
    opportunities: db.opportunities ?? base.opportunities,
    aiResearchJobs: db.aiResearchJobs ?? base.aiResearchJobs,
    leadFindings: db.leadFindings ?? base.leadFindings,
    syncTarget: db.syncTarget ?? base.syncTarget,
    syncRuns: db.syncRuns ?? base.syncRuns,
    whatsappSettings: {
      ...base.whatsappSettings,
      ...(db.whatsappSettings ?? {}),
      starsenderApiKey: db.whatsappSettings?.starsenderApiKey ?? process.env.STARSENDER_API_KEY ?? "",
      wabaAccessToken: db.whatsappSettings?.wabaAccessToken ?? process.env.WABA_ACCESS_TOKEN ?? "",
      wabaPhoneNumberId: db.whatsappSettings?.wabaPhoneNumberId ?? process.env.WABA_PHONE_NUMBER_ID ?? ""
    },
    whatsappContacts: db.whatsappContacts ?? base.whatsappContacts,
    whatsappMessages: (db.whatsappMessages ?? base.whatsappMessages).map((message) => ({
      ...message,
      contactPhone: message.contactPhone ?? message.from ?? message.to
    }))
  };
}

function ensureDatabase(): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, JSON.stringify(initialDatabase(), null, 2));
  }
}

export function readDb(): CrmDatabase {
  ensureDatabase();
  const raw = JSON.parse(readFileSync(dbPath, "utf8")) as Partial<CrmDatabase>;
  const db = normalizeDatabase(raw);
  if (!raw.whatsappSettings || !raw.whatsappMessages || !raw.whatsappContacts) {
    writeDb(db);
  }
  return db;
}

export function writeDb(db: CrmDatabase): CrmDatabase {
  ensureDatabase();
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
  return db;
}

export function updateDb(mutator: (db: CrmDatabase) => void): CrmDatabase {
  const db = readDb();
  mutator(db);
  return writeDb(db);
}

export function upsertAccount(account: Account): Account {
  updateDb((db) => {
    const index = db.accounts.findIndex((item) => item.id === account.id);
    if (index >= 0) db.accounts[index] = account;
    else db.accounts.unshift(account);
  });
  return account;
}

export function addOpportunity(opportunity: Opportunity): Opportunity {
  updateDb((db) => {
    db.opportunities.unshift(opportunity);
  });
  return opportunity;
}

export function addFinding(finding: LeadFinding): LeadFinding {
  updateDb((db) => {
    db.leadFindings.unshift(finding);
  });
  return finding;
}

export function updateSyncTarget(syncTarget: SyncTarget): SyncTarget {
  updateDb((db) => {
    db.syncTarget = syncTarget;
  });
  return syncTarget;
}

export function addSyncRun(syncRun: SyncRun): SyncRun {
  updateDb((db) => {
    db.syncRuns.unshift(syncRun);
  });
  return syncRun;
}
