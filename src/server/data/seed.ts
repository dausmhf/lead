import type { Account, AiResearchJob, Offer, Opportunity } from "../../shared/types";

export const prospectTeam = ["Daus"] as const;

export const offers: Offer[] = [
  {
    id: "offer-website-company-profile",
    productLine: "Program",
    name: "Website Company Profile",
    targetMarket: ["B2B", "B2G", "B2P", "B2COM"],
    pricingNote: "Paket website company profile mulai Rp3.500.000, final mengikuti jumlah halaman, copywriting, dan integrasi.",
    packagePrice: 3500000,
    deliverables: ["Desain website responsif", "Landing section profil", "Form kontak", "SEO dasar", "Deployment"]
  },
  {
    id: "offer-landing-page",
    productLine: "Media",
    name: "Landing Page Conversion",
    targetMarket: ["B2B", "B2P", "B2COM"],
    pricingNote: "Landing page campaign mulai Rp2.500.000 untuk validasi offer, iklan, dan funnel WhatsApp.",
    packagePrice: 2500000,
    deliverables: ["Landing page cepat", "Copywriting offer", "CTA WhatsApp", "Tracking pixel siap pasang"]
  },
  {
    id: "offer-online-store",
    productLine: "Program",
    name: "Website Toko Online",
    targetMarket: ["B2B", "B2COM"],
    pricingNote: "Toko online mulai Rp5.000.000, final mengikuti katalog produk, checkout, dan integrasi pembayaran.",
    packagePrice: 5000000,
    deliverables: ["Katalog produk", "Keranjang/checkout", "Admin produk", "Integrasi WhatsApp/order"]
  },
  {
    id: "offer-web-maintenance",
    productLine: "Program",
    name: "Maintenance Website",
    targetMarket: ["B2B", "B2G", "B2P", "B2COM"],
    pricingNote: "Retainer maintenance mulai Rp1.000.000/bulan untuk update, backup, monitoring, dan perbaikan ringan.",
    packagePrice: 1000000,
    deliverables: ["Update konten", "Backup berkala", "Monitoring uptime", "Perbaikan ringan"]
  }
];

export const accounts: Account[] = [];

export const opportunities: Opportunity[] = [];

export const aiResearchJobs: AiResearchJob[] = [
  {
    id: "job-website-prospect-template",
    query: "bisnis lokal yang belum punya website profesional",
    status: "done",
    requestedBy: "Daus",
    found: 0,
    valid: 0,
    duplicates: 0,
    createdAt: "2026-06-06T00:00:00.000Z",
    finishedAt: "2026-06-06T00:00:00.000Z",
    notes: "Dashboard personal untuk lead jasa pembuatan website.",
    provider: "manual"
  }
];
