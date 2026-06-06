import type { Account, AccountType, AiResearchJob, LeadFinding, Offer, ProspectOwner } from "../../shared/types";
import { readDb, updateDb } from "../data/store";
import { searchGooglePlaces } from "./googlePlaces";

function classifyType(query: string, category: string): AccountType {
  const text = `${query} ${category}`.toLowerCase();
  if (text.includes("dinas") || text.includes("kementerian") || text.includes("pemerintah")) return "B2G";
  if (text.includes("ustaz") || text.includes("dokter") || text.includes("coach") || text.includes("personal")) return "B2P";
  if (text.includes("komunitas") || text.includes("jamaah")) return "B2COM";
  return "B2B";
}

function inferIndustry(query: string, category: string): string {
  const text = `${query} ${category}`.toLowerCase();
  if (text.includes("restoran") || text.includes("kuliner") || text.includes("cafe") || text.includes("f&b")) return "F&B Lokal";
  if (text.includes("klinik") || text.includes("kesehatan") || text.includes("dokter")) return "Klinik & Healthcare";
  if (text.includes("kontraktor") || text.includes("arsitek") || text.includes("interior")) return "Jasa Profesional";
  if (text.includes("travel") || text.includes("hotel") || text.includes("villa")) return "Travel & Hospitality";
  if (text.includes("toko") || text.includes("retail") || text.includes("fashion")) return "Retail & Toko Online";
  if (text.includes("dinas") || text.includes("pemerintah")) return "Government";
  return category || "Prospek Website";
}

function offerMatchFor(industry: string, type: AccountType): string[] {
  const text = `${industry} ${type}`.toLowerCase();
  if (text.includes("retail") || text.includes("toko")) return ["Website Toko Online", "Landing Page Conversion"];
  if (text.includes("campaign") || text.includes("event")) return ["Landing Page Conversion", "Website Company Profile"];
  if (type === "B2G") return ["Website Company Profile", "Maintenance Website"];
  return ["Website Company Profile", "Landing Page Conversion"];
}

function scoreFinding(rating?: number, userRatingsTotal?: number): number {
  const ratingScore = rating ? Math.min(20, Math.round(rating * 4)) : 10;
  const reviewScore = userRatingsTotal ? Math.min(20, Math.round(userRatingsTotal / 20)) : 8;
  return Math.min(95, 45 + ratingScore + reviewScore);
}

export async function createResearchJob(input: {
  query: string;
  requestedBy: ProspectOwner;
  googlePlacesApiKey?: string;
  limit?: number;
}): Promise<{ job: AiResearchJob; findings: LeadFinding[] }> {
  const createdAt = new Date().toISOString();
  const job: AiResearchJob = {
    id: `job-${Date.now()}`,
    query: input.query,
    status: "done",
    requestedBy: input.requestedBy,
    found: 0,
    valid: 0,
    duplicates: 0,
    createdAt,
    finishedAt: createdAt,
    notes: "",
    provider: input.googlePlacesApiKey || process.env.GOOGLE_PLACES_API_KEY ? "google_places" : "mock"
  };

  try {
    const placeLeads = await searchGooglePlaces(input.query, input.googlePlacesApiKey, input.limit ?? 10);
    const db = readDb();
    const existingNames = new Set([
      ...db.accounts.map((item) => item.name.toLowerCase()),
      ...db.leadFindings.map((item) => item.name.toLowerCase())
    ]);
    const findings = placeLeads.map((lead) => {
      const type = classifyType(input.query, lead.category);
      const industry = inferIndustry(input.query, lead.category);
      const offerMatch = offerMatchFor(industry, type);
      return {
        id: `finding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        jobId: job.id,
        name: lead.name,
        type,
        industry,
        location: lead.location,
        website: lead.website,
        phone: lead.phone,
        address: lead.address,
        googlePlaceId: lead.placeId,
        rating: lead.rating,
        userRatingsTotal: lead.userRatingsTotal,
        source: job.provider === "google_places" ? "Google Places" as const : "Mock Research" as const,
        reasonFit: `${lead.name} relevan untuk ${offerMatch.join(" / ")} berdasarkan kategori ${industry}.`,
        problemHypothesis: "Kemungkinan butuh website yang lebih rapi, mudah ditemukan di Google, punya CTA WhatsApp jelas, dan meningkatkan trust calon pembeli.",
        offerMatch,
        priorityScore: scoreFinding(lead.rating, lead.userRatingsTotal),
        owner: input.requestedBy,
        status: existingNames.has(lead.name.toLowerCase()) ? "rejected" as const : "pending" as const,
        createdAt
      };
    });

    job.found = placeLeads.length;
    job.valid = findings.filter((item) => item.status === "pending").length;
    job.duplicates = findings.filter((item) => item.status === "rejected").length;
    job.notes = job.provider === "google_places"
      ? "Riset Google Places selesai. Review temuan lalu approve sebelum masuk database lead."
      : "Mock research selesai. Nanti saat kamu kasih Google Places API key, flow yang sama akan memakai data real.";

    updateDb((nextDb) => {
      nextDb.aiResearchJobs.unshift(job);
      nextDb.leadFindings.unshift(...findings);
    });

    return { job, findings };
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "Research failed";
    job.notes = "Riset gagal. Cek API key, quota, atau query.";
    updateDb((nextDb) => {
      nextDb.aiResearchJobs.unshift(job);
    });
    return { job, findings: [] };
  }
}

export function matchOffers(account: Account): Offer[] {
  const { offers } = readDb();
  const text = `${account.industry} ${account.problemHypothesis}`.toLowerCase();
  return offers
    .map((offer) => {
      const score =
        (offer.targetMarket.includes(account.type) ? 2 : 0)
        + offer.deliverables.filter((item) => text.includes(item.toLowerCase().split(" ")[0])).length;
      return { offer, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.offer);
}

export function generateOutreach(account: Account): string {
  const primaryOffer = account.offerMatch[0] ?? "Website Company Profile";
  return `Halo, saya Daus. Saya lihat ${account.name} punya potensi kuat di ${account.industry}. Saya bisa bantu lewat ${primaryOffer} supaya website lebih rapi, mudah dipercaya, dan punya CTA WhatsApp yang jelas. Apakah minggu ini berkenan ngobrol 15 menit untuk cek kebutuhan websitenya?`;
}
