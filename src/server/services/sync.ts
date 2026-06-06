import type { Account, LeadFinding, SyncRun } from "../../shared/types";
import { addSyncRun, readDb, updateDb } from "../data/store";

interface PushInput {
  endpointUrl?: string;
  authHeader?: string;
  accountIds?: string[];
  findingIds?: string[];
  dryRun?: boolean;
}

function buildPayload(accounts: Account[], findings: LeadFinding[]) {
  return {
    source: "LEAD-WEBSITE",
    pushedAt: new Date().toISOString(),
    accounts,
    findings
  };
}

export async function pushToExternalCrm(input: PushInput): Promise<SyncRun> {
  const db = readDb();
  const endpointUrl = input.endpointUrl || db.syncTarget.endpointUrl || process.env.CRM_PUSH_ENDPOINT || "";
  const authHeader = input.authHeader || db.syncTarget.authHeader || process.env.CRM_PUSH_AUTH_HEADER || "";
  const accounts = input.accountIds?.length
    ? db.accounts.filter((account) => input.accountIds?.includes(account.id))
    : db.accounts;
  const findings = input.findingIds?.length
    ? db.leadFindings.filter((finding) => input.findingIds?.includes(finding.id))
    : db.leadFindings.filter((finding) => finding.status === "approved");

  const runBase = {
    id: `sync-${Date.now()}`,
    targetUrl: endpointUrl || "dry-run",
    accountCount: accounts.length,
    findingCount: findings.length,
    createdAt: new Date().toISOString()
  };

  if (input.dryRun) {
    return addSyncRun({
      ...runBase,
      status: "dry_run",
      responseBody: JSON.stringify(buildPayload(accounts, findings)).slice(0, 2000)
    });
  }

  if (!endpointUrl) {
    return addSyncRun({
      ...runBase,
      status: "failed",
      error: "Endpoint URL belum diisi."
    });
  }

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {})
      },
      body: JSON.stringify(buildPayload(accounts, findings))
    });
    const responseBody = await response.text();
    const syncRun: SyncRun = {
      ...runBase,
      status: response.ok ? "success" : "failed",
      responseStatus: response.status,
      responseBody: responseBody.slice(0, 2000)
    };

    updateDb((nextDb) => {
      nextDb.syncRuns.unshift(syncRun);
      if (response.ok) {
        const pushedFindingIds = new Set(findings.map((finding) => finding.id));
        nextDb.leadFindings = nextDb.leadFindings.map((finding) =>
          pushedFindingIds.has(finding.id)
            ? { ...finding, status: "synced", syncedAt: syncRun.createdAt }
            : finding
        );
      }
    });

    return syncRun;
  } catch (error) {
    return addSyncRun({
      ...runBase,
      status: "failed",
      error: error instanceof Error ? error.message : "Sync failed"
    });
  }
}
