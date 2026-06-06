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
    syncRuns: []
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
  return JSON.parse(readFileSync(dbPath, "utf8")) as CrmDatabase;
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
