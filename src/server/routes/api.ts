import { Router } from "express";
import { z } from "zod";
import type { Account, LeadFinding, Offer, Opportunity } from "../../shared/types";
import { prospectTeam } from "../data/seed";
import { readDb, updateDb, updateSyncTarget } from "../data/store";
import { createResearchJob, generateOutreach, matchOffers } from "../services/aiResearch";
import { pushToExternalCrm } from "../services/sync";
import {
  createLeadFromWhatsAppContact,
  generateWaDraft,
  preferredWaNumber,
  recordInboundWhatsApp,
  recordStarsenderWebhook,
  refreshWhatsAppMessageStatus,
  renderWaTemplate,
  scheduleWhatsAppFollowUp,
  screenWhatsAppContact,
  sendWhatsAppFollowUp,
  sendWhatsAppMessage,
  sendWhatsAppToContact
} from "../services/whatsapp";

export const apiRouter = Router();

const stageSchema = z.enum([
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
]);

const accountSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["B2B", "B2G", "B2P", "B2COM"]),
  industry: z.string().min(2),
  location: z.string().min(2),
  owner: z.enum(prospectTeam),
  priorityScore: z.number().min(0).max(100).default(50),
  website: z.string().optional(),
  instagram: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  ownerName: z.string().optional(),
  ownerInstagram: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerFacebook: z.string().optional(),
  ownerLinkedin: z.string().optional(),
  ownerEmail: z.string().optional(),
  offerMatch: z.array(z.string()).optional(),
  source: z.string().optional(),
  stage: stageSchema.optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  dealValue: z.number().optional().default(0)
});

const inboxLeadSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["B2B", "B2G", "B2P", "B2COM"]).default("B2B"),
  industry: z.string().default("Belum diklasifikasi"),
  location: z.string().default("Indonesia"),
  website: z.string().optional(),
  instagram: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  tiktok: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  googleBusinessProfile: z.string().optional(),
  ownerName: z.string().optional(),
  ownerInstagram: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerFacebook: z.string().optional(),
  ownerLinkedin: z.string().optional(),
  ownerEmail: z.string().optional(),
  decisionMaker: z.string().default("Belum diketahui"),
  problemHypothesis: z.string().default("Perlu validasi pain dan kebutuhan client."),
  offerMatch: z.array(z.string()).default([]),
  priorityScore: z.number().min(0).max(100).default(60),
  owner: z.enum(prospectTeam).default("Daus"),
  pic: z.enum(prospectTeam).optional(),
  source: z.string().default("Codex Research"),
  externalId: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().default("Review data dan tentukan brief awal."),
  stage: stageSchema.default("Belum Dihubungi"),
  briefStatus: z.enum(["Belum Brief", "On Brief", "Brief Sent", "Revisi Brief", "Deal Brief"]).default("Belum Brief"),
  dealValue: z.number().optional().default(0)
});

const whatsappSettingsSchema = z.object({
  provider: z.enum(["mock", "starsender", "waba"]),
  enabled: z.boolean().default(false),
  starsenderApiKey: z.string().optional(),
  starsenderAccountApiKey: z.string().optional(),
  starsenderBaseUrl: z.string().url().optional().or(z.literal("")),
  wabaAccessToken: z.string().optional(),
  wabaPhoneNumberId: z.string().optional()
});

function findOfferByProduct(offers: Offer[], product?: string): Offer | undefined {
  const normalized = (product ?? "").toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes("landing")) return offers.find((offer) => offer.id === "offer-landing-page");
  if (normalized.includes("toko") || normalized.includes("ecommerce") || normalized.includes("online store")) return offers.find((offer) => offer.id === "offer-online-store");
  if (normalized.includes("maintenance") || normalized.includes("retainer")) return offers.find((offer) => offer.id === "offer-web-maintenance");
  if (normalized.includes("company") || normalized.includes("profile") || normalized.includes("website")) return offers.find((offer) => offer.id === "offer-website-company-profile");
  return offers.find((offer) => offer.name.toLowerCase() === normalized);
}

function createAccountFromFinding(finding: LeadFinding, offers: Offer[]): { account: Account; opportunity: Opportunity } {
  const now = new Date().toISOString();
  const matchedOffer = findOfferByProduct(offers, finding.offerMatch[0]);
  const defaultDealValue = matchedOffer?.packagePrice ?? matchedOffer?.pricePerProspect ?? 3500000;
  const account: Account = {
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: finding.name,
    type: finding.type,
    industry: finding.industry,
    location: finding.location,
    website: finding.website,
    audienceSize: finding.userRatingsTotal ?? 0,
    budgetClass: finding.priorityScore >= 80 ? "Tinggi" : finding.priorityScore >= 60 ? "Menengah" : "Rendah",
    decisionMaker: "Belum diketahui",
    problemHypothesis: finding.problemHypothesis,
    offerMatch: finding.offerMatch,
    priorityScore: finding.priorityScore,
    dealValue: defaultDealValue,
    stage: "Belum Dihubungi",
    owner: finding.owner,
    source: finding.source,
    externalId: finding.googlePlaceId,
    createdAt: now,
    updatedAt: now
  };
  const opportunity: Opportunity = {
    id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    accountId: account.id,
    offerId: matchedOffer?.id ?? "offer-website-company-profile",
    stage: "Belum Dihubungi",
    dealValue: defaultDealValue,
    probability: Math.max(30, Math.min(75, finding.priorityScore - 20)),
    expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString().slice(0, 10),
    source: finding.source,
    owner: finding.owner,
    nextAction: "Review kebutuhan website, cek aset brand, lalu kirim outreach pertama."
  };
  return { account, opportunity };
}

apiRouter.get("/health", (_req, res) => res.json({ ok: true, service: "LEAD-WEBSITE" }));

apiRouter.get("/summary", (_req, res) => {
  const db = readDb();
  const revenueStages = new Set(["Meeting", "Negosiasi", "Kirim MOU", "Transfer", "Closed (WON)"]);
  const totalPotentialDeal = db.accounts
    .filter((item) => revenueStages.has(item.stage))
    .reduce((sum, item) => sum + (item.dealValue || 0), 0);
  const projectedRevenue = db.accounts.reduce((sum, item) => {
    let prob = 50;
    if (item.stage === "Closed (WON)") prob = 100;
    else if (item.stage === "Ditolak") prob = 0;
    else if (item.stage === "Transfer") prob = 90;
    else if (item.stage === "Kirim MOU") prob = 80;
    else if (item.stage === "Negosiasi") prob = 70;
    else if (item.stage === "Meeting") prob = 60;
    else if (item.stage === "Kirim Proposal") prob = 40;
    else if (item.stage === "Chat Management") prob = 25;
    else if (item.stage === "Chat Admin") prob = 20;
    else if (item.stage === "Belum Dihubungi") prob = 15;
    return sum + (item.dealValue || 0) * (prob / 100);
  }, 0);

  res.json({
    totalLead: db.accounts.length,
    prospectLead: db.accounts.filter((item) => item.stage === "Belum Dihubungi").length,
    chat_managementLead: db.accounts.filter((item) => item.stage === "Chat Management").length,
    onBrief: db.accounts.filter((item) => item.stage === "Kirim Proposal").length,
    meetingScheduled: db.accounts.filter((item) => item.stage === "Meeting").length,
    proposalSent: db.accounts.filter((item) => item.stage === "Kirim MOU").length,
    closedWon: db.accounts.filter((item) => item.stage === "Closed (WON)").length,
    closedLost: db.accounts.filter((item) => item.stage === "Ditolak").length,
    pendingFindings: db.leadFindings.filter((item) => item.status === "pending").length,
    approvedFindings: db.leadFindings.filter((item) => item.status === "approved").length,
    syncedFindings: db.leadFindings.filter((item) => item.status === "synced").length,
    totalPotentialDeal,
    projectedRevenue,
    team: prospectTeam
  });
});

apiRouter.get("/accounts", (_req, res) => res.json(readDb().accounts));

apiRouter.get("/filters", (_req, res) => {
  const db = readDb();
  res.json({
    owners: prospectTeam,
    cities: [...new Set(db.accounts.map((account) => account.location).filter(Boolean))].sort(),
    industries: [...new Set(db.accounts.map((account) => account.industry).filter(Boolean))].sort(),
    stages: [
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
    ]
  });
});

apiRouter.post("/accounts", (req, res) => {
  const parsed = accountSchema.parse(req.body);
  const now = new Date().toISOString();
  const account: Account = {
    id: `acc-${Date.now()}`,
    ...parsed,
    audienceSize: 0,
    budgetClass: "Menengah",
    decisionMaker: "Belum diketahui",
    problemHypothesis: "Perlu riset AI/manual untuk validasi pain bisnis.",
    offerMatch: parsed.offerMatch ?? [],
    stage: parsed.stage ?? "Belum Dihubungi",
    briefStatus: parsed.stage === "Kirim Proposal" ? "On Brief" : "Belum Brief",
    notes: parsed.notes,
    nextAction: parsed.nextAction ?? "Review data dan tentukan brief awal.",
    dealValue: parsed.dealValue ?? 0,
    createdAt: now,
    updatedAt: now
  };
  updateDb((db) => {
    db.accounts.unshift(account);
  });
  res.status(201).json(account);
});

apiRouter.post("/inbox/leads", (req, res) => {
  const body = z.object({ leads: z.array(inboxLeadSchema).min(1) }).or(inboxLeadSchema).parse(req.body);
  const leads = "leads" in body ? body.leads : [body];
  const now = new Date().toISOString();
  const accounts: Account[] = [];
  const opportunities: Opportunity[] = [];

  updateDb((db) => {
    for (const lead of leads) {
      const existing = db.accounts.find((account) => {
        if (lead.externalId) return account.externalId === lead.externalId;
        return account.name.toLowerCase() === lead.name.toLowerCase()
          && account.location.toLowerCase() === lead.location.toLowerCase();
      });

      if (existing) {
        Object.assign(existing, {
          name: lead.name,
          type: lead.type,
          industry: lead.industry,
          location: lead.location,
          website: lead.website,
          instagram: lead.instagram,
          phone: lead.phone,
          email: lead.email,
          tiktok: lead.tiktok,
          facebook: lead.facebook,
          linkedin: lead.linkedin,
          googleBusinessProfile: lead.googleBusinessProfile,
          ownerName: lead.ownerName,
          ownerInstagram: lead.ownerInstagram,
          ownerPhone: lead.ownerPhone,
          ownerFacebook: lead.ownerFacebook,
          ownerLinkedin: lead.ownerLinkedin,
          ownerEmail: lead.ownerEmail,
          decisionMaker: lead.decisionMaker,
          problemHypothesis: lead.problemHypothesis,
          offerMatch: lead.offerMatch.length ? lead.offerMatch : existing.offerMatch,
          priorityScore: lead.priorityScore,
          owner: lead.pic ?? lead.owner,
          source: lead.source,
          externalId: lead.externalId,
          notes: lead.notes,
          nextAction: lead.nextAction,
          stage: lead.stage,
          briefStatus: lead.briefStatus,
          dealValue: lead.dealValue ?? existing.dealValue,
          updatedAt: now
        });
        accounts.push(existing);
        continue;
      }

      const matchedOffer = findOfferByProduct(db.offers, lead.offerMatch[0]);
      const defaultDealValue = lead.dealValue ?? matchedOffer?.packagePrice ?? matchedOffer?.pricePerProspect ?? 3500000;
      const account: Account = {
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: lead.name,
        type: lead.type,
        industry: lead.industry,
        location: lead.location,
        website: lead.website,
        instagram: lead.instagram,
        phone: lead.phone,
        email: lead.email,
        tiktok: lead.tiktok,
        facebook: lead.facebook,
        linkedin: lead.linkedin,
        googleBusinessProfile: lead.googleBusinessProfile,
        ownerName: lead.ownerName,
        ownerInstagram: lead.ownerInstagram,
        ownerPhone: lead.ownerPhone,
        ownerFacebook: lead.ownerFacebook,
        ownerLinkedin: lead.ownerLinkedin,
        ownerEmail: lead.ownerEmail,
        audienceSize: 0,
        budgetClass: lead.priorityScore >= 80 ? "Tinggi" : lead.priorityScore >= 60 ? "Menengah" : "Rendah",
        decisionMaker: lead.decisionMaker,
        problemHypothesis: lead.problemHypothesis,
        offerMatch: lead.offerMatch,
        priorityScore: lead.priorityScore,
        stage: lead.stage,
        owner: lead.pic ?? lead.owner,
        source: lead.source,
        externalId: lead.externalId,
        notes: lead.notes,
        nextAction: lead.nextAction,
        briefStatus: lead.briefStatus,
        dealValue: defaultDealValue,
        createdAt: now,
        updatedAt: now
      };
      const opportunity: Opportunity = {
        id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        accountId: account.id,
        offerId: matchedOffer?.id ?? "offer-website-company-profile",
        stage: lead.stage,
        dealValue: defaultDealValue,
        probability: Math.max(20, Math.min(80, lead.priorityScore - 10)),
        expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
        source: lead.source,
        owner: lead.pic ?? lead.owner,
        nextAction: lead.nextAction
      };
      db.accounts.unshift(account);
      db.opportunities.unshift(opportunity);
      accounts.push(account);
      opportunities.push(opportunity);
    }
  });

  res.status(201).json({ accepted: accounts.length, accounts, opportunities });
});

apiRouter.patch("/accounts/:id", (req, res) => {
  let updatedAccount: Account | undefined;
  const { dealValue, ...accountFields } = req.body;
  updateDb((db) => {
    const account = db.accounts.find((item) => item.id === req.params.id);
    if (!account) return;
    Object.assign(account, accountFields, { updatedAt: new Date().toISOString() });
    if (dealValue !== undefined) {
      account.dealValue = Number(dealValue);
    }
    updatedAccount = account;

    if (dealValue !== undefined) {
      const opportunity = db.opportunities.find((item) => item.accountId === req.params.id);
      if (opportunity) {
        opportunity.dealValue = Number(dealValue);
        opportunity.stage = account.stage;
      } else {
        db.opportunities.push({
          id: `opp-${Date.now()}`,
          accountId: account.id,
          offerId: "offer-website-company-profile",
          stage: account.stage,
          dealValue: Number(dealValue),
          probability: 50,
          expectedCloseDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
          source: account.source ?? "Manual",
          owner: account.owner,
          nextAction: account.nextAction ?? ""
        });
      }
    }
    if (accountFields.stage !== undefined) {
      const opportunity = db.opportunities.find((item) => item.accountId === req.params.id);
      if (opportunity) {
        opportunity.stage = accountFields.stage;
      }
    }
  });
  if (!updatedAccount) return res.status(404).json({ error: "Account not found" });
  res.json(updatedAccount);
});

apiRouter.delete("/accounts/:id", (req, res) => {
  let deleted = false;
  updateDb((db) => {
    const before = db.accounts.length;
    db.accounts = db.accounts.filter((item) => item.id !== req.params.id);
    deleted = db.accounts.length !== before;
    if (deleted) {
      db.opportunities = db.opportunities.filter((item) => item.accountId !== req.params.id);
      db.whatsappMessages = db.whatsappMessages.filter((item) => item.accountId !== req.params.id);
    }
  });
  if (!deleted) return res.status(404).json({ error: "Account not found" });
  res.json({ deleted: 1 });
});

apiRouter.post("/accounts/batch-update", (req, res) => {
  const body = z.object({
    accountIds: z.array(z.string()).min(1),
    stage: stageSchema.optional(),
    owner: z.enum(prospectTeam).optional(),
    nextAction: z.string().optional(),
    briefStatus: z.enum(["Belum Brief", "On Brief", "Brief Sent", "Revisi Brief", "Deal Brief"]).optional()
  }).parse(req.body);
  let updated = 0;
  updateDb((db) => {
    for (const account of db.accounts) {
      if (!body.accountIds.includes(account.id)) continue;
      Object.assign(account, {
        ...(body.stage ? { stage: body.stage } : {}),
        ...(body.owner ? { owner: body.owner } : {}),
        ...(body.nextAction !== undefined ? { nextAction: body.nextAction } : {}),
        ...(body.briefStatus ? { briefStatus: body.briefStatus } : {}),
        updatedAt: new Date().toISOString()
      });
      updated += 1;
    }
  });
  res.json({ updated });
});

apiRouter.post("/accounts/batch-delete", (req, res) => {
  const body = z.object({
    accountIds: z.array(z.string()).min(1)
  }).parse(req.body);
  let deleted = 0;
  updateDb((db) => {
    const ids = new Set(body.accountIds);
    const before = db.accounts.length;
    db.accounts = db.accounts.filter((account) => !ids.has(account.id));
    deleted = before - db.accounts.length;
    if (deleted > 0) {
      db.opportunities = db.opportunities.filter((opportunity) => !ids.has(opportunity.accountId));
    }
  });
  res.json({ deleted });
});

apiRouter.get("/offers", (_req, res) => res.json(readDb().offers));
apiRouter.get("/opportunities", (_req, res) => res.json(readDb().opportunities));

apiRouter.patch("/opportunities/:id/stage", (req, res) => {
  const body = z.object({ stage: stageSchema }).parse(req.body);
  let updatedOpportunity: Opportunity | undefined;
  updateDb((db) => {
    const opportunity = db.opportunities.find((item) => item.id === req.params.id);
    if (!opportunity) return;
    opportunity.stage = body.stage;
    updatedOpportunity = opportunity;
  });
  if (!updatedOpportunity) return res.status(404).json({ error: "Opportunity not found" });
  res.json(updatedOpportunity);
});

apiRouter.get("/lead-findings", (_req, res) => res.json(readDb().leadFindings));

apiRouter.post("/lead-findings/:id/approve", (req, res) => {
  let createdAccount: Account | undefined;
  let createdOpportunity: Opportunity | undefined;
  updateDb((db) => {
    const finding = db.leadFindings.find((item) => item.id === req.params.id);
    if (!finding || finding.status !== "pending") return;
    const created = createAccountFromFinding(finding, db.offers);
    createdAccount = created.account;
    createdOpportunity = created.opportunity;
    finding.status = "approved";
    db.accounts.unshift(createdAccount);
    db.opportunities.unshift(createdOpportunity);
  });
  if (!createdAccount) return res.status(404).json({ error: "Pending finding not found" });
  res.status(201).json({ account: createdAccount, opportunity: createdOpportunity });
});

apiRouter.post("/lead-findings/:id/reject", (req, res) => {
  let changed = false;
  updateDb((db) => {
    const finding = db.leadFindings.find((item) => item.id === req.params.id);
    if (!finding) return;
    finding.status = "rejected";
    changed = true;
  });
  if (!changed) return res.status(404).json({ error: "Finding not found" });
  res.json({ ok: true });
});

apiRouter.get("/ai/research-jobs", (_req, res) => res.json(readDb().aiResearchJobs));

apiRouter.get("/ai/research-jobs/:id", (req, res) => {
  const job = readDb().aiResearchJobs.find((item) => item.id === req.params.id);
  if (!job) return res.status(404).json({ error: "Research job not found" });
  res.json(job);
});

apiRouter.post("/ai/research-leads", async (req, res, next) => {
  try {
    const body = z.object({
      query: z.string().min(3),
      requestedBy: z.enum(prospectTeam),
      googlePlacesApiKey: z.string().optional(),
      limit: z.number().min(1).max(20).optional()
    }).parse(req.body);
    res.status(201).json(await createResearchJob(body));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/ai/enrich-lead/:accountId", (req, res) => {
  let updatedAccount: Account | undefined;
  updateDb((db) => {
    const account = db.accounts.find((item) => item.id === req.params.accountId);
    if (!account) return;
    account.stage = "Belum Dihubungi";
    account.problemHypothesis = `${account.problemHypothesis} Data siap diperkaya via Google Places, website, dan social signal.`;
    account.updatedAt = new Date().toISOString();
    updatedAccount = account;
  });
  if (!updatedAccount) return res.status(404).json({ error: "Account not found" });
  res.json(updatedAccount);
});

apiRouter.post("/ai/match-offer/:accountId", (req, res) => {
  let updatedAccount: Account | undefined;
  let matched: Offer[] = [];
  updateDb((db) => {
    const account = db.accounts.find((item) => item.id === req.params.accountId);
    if (!account) return;
    matched = matchOffers(account);
    account.offerMatch = matched.map((item) => item.name);
    account.stage = "Belum Dihubungi";
    account.updatedAt = new Date().toISOString();
    updatedAccount = account;
  });
  if (!updatedAccount) return res.status(404).json({ error: "Account not found" });
  res.json({ account: updatedAccount, matched });
});

apiRouter.post("/ai/generate-outreach/:accountId", (req, res) => {
  const account = readDb().accounts.find((item) => item.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json({ accountId: account.id, channel: "WhatsApp", draft: generateOutreach(account) });
});

apiRouter.get("/sync/target", (_req, res) => res.json(readDb().syncTarget));

apiRouter.put("/sync/target", (req, res) => {
  const body = z.object({
    endpointUrl: z.string().url().or(z.literal("")),
    authHeader: z.string().optional(),
    enabled: z.boolean().default(true)
  }).parse(req.body);
  res.json(updateSyncTarget({ ...body, updatedAt: new Date().toISOString() }));
});

apiRouter.get("/sync/runs", (_req, res) => res.json(readDb().syncRuns));

apiRouter.post("/sync/push", async (req, res, next) => {
  try {
    const body = z.object({
      endpointUrl: z.string().url().optional(),
      authHeader: z.string().optional(),
      accountIds: z.array(z.string()).optional(),
      findingIds: z.array(z.string()).optional(),
      dryRun: z.boolean().optional()
    }).parse(req.body);
    res.status(201).json(await pushToExternalCrm(body));
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/whatsapp/settings", (_req, res) => {
  res.json(readDb().whatsappSettings);
});

apiRouter.put("/whatsapp/settings", (req, res) => {
  const body = whatsappSettingsSchema.parse(req.body);
  let settings = readDb().whatsappSettings;
  updateDb((db) => {
    db.whatsappSettings = {
      ...db.whatsappSettings,
      ...body,
      starsenderBaseUrl: body.starsenderBaseUrl || "https://api.starsender.online/api",
      updatedAt: new Date().toISOString()
    };
    settings = db.whatsappSettings;
  });
  res.json(settings);
});

apiRouter.get("/whatsapp/messages/:accountId", (req, res) => {
  const messages = readDb().whatsappMessages
    .filter((message) => message.accountId === req.params.accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(messages);
});

apiRouter.post("/whatsapp/messages/:id/status", async (req, res) => {
  try {
    res.json(await refreshWhatsAppMessageStatus(req.params.id));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Gagal memeriksa status pesan WhatsApp."
    });
  }
});

apiRouter.get("/whatsapp/inbox", (_req, res) => {
  const db = readDb();
  const messagesByPhone = new Map<string, typeof db.whatsappMessages[number]>();
  for (const message of db.whatsappMessages) {
    const phone = message.contactPhone || message.from || message.to;
    const existing = messagesByPhone.get(phone);
    if (!existing || message.createdAt > existing.createdAt) messagesByPhone.set(phone, message);
  }
  const contacts = db.whatsappContacts
    .map((contact) => ({
      ...contact,
      account: contact.accountId ? db.accounts.find((account) => account.id === contact.accountId) : undefined,
      lastMessage: messagesByPhone.get(contact.phone)
    }))
    .sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  res.json({ contacts, totalMessages: db.whatsappMessages.length });
});

apiRouter.get("/whatsapp/templates", (_req, res) => {
  res.json(readDb().whatsappTemplates.filter((template) => template.enabled));
});

apiRouter.get("/whatsapp/follow-ups", (_req, res) => {
  const db = readDb();
  const followUps = db.whatsappFollowUps
    .map((task) => ({
      ...task,
      account: task.accountId ? db.accounts.find((account) => account.id === task.accountId) : undefined,
      contact: db.whatsappContacts.find((contact) => contact.phone === task.contactPhone)
    }))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  res.json(followUps);
});

apiRouter.get("/whatsapp/messages/by-phone/:phone", (req, res) => {
  const phone = req.params.phone.replace(/\D/g, "");
  const messages = readDb().whatsappMessages
    .filter((message) => (message.contactPhone || message.from || message.to) === phone)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  res.json(messages);
});

apiRouter.post("/whatsapp/contacts/:phone/screen", (req, res) => {
  const body = z.object({
    classification: z.enum(["cold", "warm", "hot", "ask_price", "meeting", "rejected", "not_valid", "unknown"]),
    status: z.enum(["new", "screened", "linked", "ignored"]).optional(),
    notes: z.string().optional(),
    accountId: z.string().optional()
  }).parse(req.body);
  const contact = screenWhatsAppContact({ phone: req.params.phone, ...body });
  if (!contact) return res.status(404).json({ error: "WhatsApp contact not found" });
  res.json(contact);
});

apiRouter.post("/whatsapp/contacts/:phone/create-lead", (req, res) => {
  const body = z.object({
    name: z.string().min(2),
    type: z.enum(["B2B", "B2G", "B2P", "B2COM"]).optional(),
    industry: z.string().optional(),
    location: z.string().optional(),
    offerMatch: z.array(z.string()).optional(),
    owner: z.enum(prospectTeam).optional(),
    notes: z.string().optional()
  }).parse(req.body);
  const created = createLeadFromWhatsAppContact({ phone: req.params.phone, ...body });
  if (!created) return res.status(404).json({ error: "WhatsApp contact not found" });
  res.status(201).json(created);
});

apiRouter.post("/whatsapp/send-contact/:phone", async (req, res, next) => {
  try {
    const body = z.object({
      body: z.string().min(3),
      accountId: z.string().optional(),
      contactName: z.string().optional()
    }).parse(req.body);
    const message = await sendWhatsAppToContact({
      contactPhone: req.params.phone,
      body: body.body,
      accountId: body.accountId,
      contactName: body.contactName
    });
    res.status(message.status === "failed" ? 502 : 201).json(message);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/whatsapp/render-template", (req, res) => {
  const body = z.object({
    templateId: z.string(),
    phone: z.string().optional(),
    accountId: z.string().optional()
  }).parse(req.body);
  const db = readDb();
  const template = db.whatsappTemplates.find((item) => item.id === body.templateId);
  if (!template) return res.status(404).json({ error: "Template not found" });
  const normalizedPhone = body.phone?.replace(/\D/g, "");
  const contact = normalizedPhone ? db.whatsappContacts.find((item) => item.phone === normalizedPhone) : undefined;
  const account = body.accountId
    ? db.accounts.find((item) => item.id === body.accountId)
    : contact?.accountId
      ? db.accounts.find((item) => item.id === contact.accountId)
      : undefined;
  res.json({ body: renderWaTemplate(template, { contact, account }) });
});

apiRouter.post("/whatsapp/follow-ups", (req, res) => {
  const body = z.object({
    contactPhone: z.string().min(4),
    accountId: z.string().optional(),
    templateId: z.string().optional(),
    title: z.string().min(2),
    body: z.string().min(3),
    dueAt: z.string().min(8)
  }).parse(req.body);
  res.status(201).json(scheduleWhatsAppFollowUp(body));
});

apiRouter.post("/whatsapp/follow-ups/:id/send", async (req, res, next) => {
  try {
    const task = await sendWhatsAppFollowUp(req.params.id);
    if (!task) return res.status(404).json({ error: "Pending follow-up not found" });
    res.status(task.status === "failed" ? 502 : 200).json(task);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/whatsapp/inbox/refresh", (_req, res) => {
  const db = readDb();
  res.json({
    contacts: db.whatsappContacts.length,
    messages: db.whatsappMessages.length,
    source: "local_webhook_store"
  });
});

apiRouter.post("/whatsapp/webhook/starsender", (req, res, next) => {
  try {
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.get("x-webhook-secret") || String(req.query.secret ?? "");
      if (provided !== secret) return res.status(401).json({ error: "Invalid webhook secret" });
    }
    const message = recordStarsenderWebhook(req.body);
    res.status(201).json({ ok: true, messageId: message.id, signal: message.signal });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/whatsapp/draft/:accountId", (req, res) => {
  const account = readDb().accounts.find((item) => item.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json({
    accountId: account.id,
    to: preferredWaNumber(account),
    draft: generateWaDraft(account)
  });
});

apiRouter.post("/whatsapp/send/:accountId", async (req, res, next) => {
  try {
    const body = z.object({
      to: z.string().optional(),
      body: z.string().min(3)
    }).parse(req.body);
    const account = readDb().accounts.find((item) => item.id === req.params.accountId);
    if (!account) return res.status(404).json({ error: "Account not found" });
    const message = await sendWhatsAppMessage({ account, to: body.to, body: body.body });
    res.status(message.status === "failed" ? 502 : 201).json(message);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/whatsapp/inbound/:accountId", (req, res) => {
  const body = z.object({
    from: z.string().min(4),
    body: z.string().min(1)
  }).parse(req.body);
  const account = readDb().accounts.find((item) => item.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.status(201).json(recordInboundWhatsApp({
    accountId: account.id,
    from: body.from,
    body: body.body
  }));
});

apiRouter.post("/operator/full-flow", async (req, res, next) => {
  try {
    const body = z.object({
      query: z.string().min(3),
      requestedBy: z.enum(prospectTeam),
      googlePlacesApiKey: z.string().optional(),
      endpointUrl: z.string().url().optional(),
      authHeader: z.string().optional(),
      autoApprove: z.boolean().default(false),
      dryRun: z.boolean().default(true),
      limit: z.number().min(1).max(20).optional()
    }).parse(req.body);
    const research = await createResearchJob(body);
    const approvedIds: string[] = [];

    if (body.autoApprove) {
      updateDb((db) => {
        for (const finding of db.leadFindings.filter((item) => item.jobId === research.job.id && item.status === "pending")) {
          const created = createAccountFromFinding(finding, db.offers);
          finding.status = "approved";
          approvedIds.push(finding.id);
          db.accounts.unshift(created.account);
          db.opportunities.unshift(created.opportunity);
        }
      });
    }

    const syncRun = await pushToExternalCrm({
      endpointUrl: body.endpointUrl,
      authHeader: body.authHeader,
      findingIds: approvedIds,
      dryRun: body.dryRun
    });

    res.status(201).json({ research, approvedIds, syncRun });
  } catch (error) {
    next(error);
  }
});
