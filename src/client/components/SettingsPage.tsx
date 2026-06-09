import React, { useState } from "react";
import { Terminal, Copy, Check, Code, Database, Globe, HelpCircle } from "lucide-react";
import type { Offer, SyncRun, SyncTarget } from "../../shared/types";

interface SettingsPageProps {
  offers: Offer[];
  syncTarget: SyncTarget | null;
  syncRuns: SyncRun[];
  onSaveTarget: (target: { endpointUrl: string; authHeader?: string; enabled: boolean }) => Promise<void>;
  onTriggerSync: (dryRun: boolean) => Promise<SyncRun>;
  busy: boolean;
}

export default function SettingsPage({
  offers,
  syncTarget,
  syncRuns,
  onSaveTarget,
  onTriggerSync,
  busy
}: SettingsPageProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const endpointUrl = "http://127.0.0.1:8788/api/inbox/leads";

  const singleLeadJson = {
    name: "Klinik Gigi Senyum Sehat",
    phone: "6281122334455",
    industry: "Klinik & Healthcare",
    location: "Jakarta",
    owner: "Daus",
    offerMatch: ["Website Company Profile"],
    stage: "Belum Dihubungi",
    dealValue: 3500000,
    notes: "Butuh website company profile dengan CTA WhatsApp dan halaman layanan yang rapi.",
    nextAction: "Hubungi via WhatsApp untuk audit website dan tawarkan company profile."
  };

  const bulkLeadsJson = {
    leads: [
      {
        name: "Kontraktor Rumah Amanah",
        phone: "6281234567890",
        industry: "Jasa Profesional",
        location: "Surabaya",
        owner: "Daus",
        stage: "Belum Dihubungi",
        dealValue: 3500000,
        notes: "Butuh website company profile untuk portfolio proyek dan lead form."
      },
      {
        name: "Toko Furniture Kayu Jati",
        phone: "6289988776655",
        industry: "Retail & Toko Online",
        location: "Bandung",
        owner: "Daus",
        stage: "Chat Management",
        dealValue: 3500000
      }
    ]
  };

  const pythonCode = `import requests
import json

# Lead website endpoint address
LEAD_URL = "${endpointUrl}"

def search_and_push_leads():
    # 1. AI Agent finds prospects and structures them into JSON format
    prospects = [
        {
            "name": "Klinik Gigi Senyum Sehat",
            "phone": "6281122334455",
            "industry": "Klinik & Healthcare",
            "location": "Jakarta",
            "website": "https://example.com",
            "instagram": "@senyumsehat",
            "owner": "Daus",
            "stage": "Belum Dihubungi",
            "dealValue": 3500000,
            "notes": "Butuh website company profile dengan CTA WhatsApp dan halaman layanan yang rapi.",
            "nextAction": "Hubungi via WhatsApp untuk audit website dan tawarkan company profile."
        },
        {
            "name": "Kontraktor Rumah Amanah",
            "phone": "6281234567890",
            "industry": "Jasa Profesional",
            "location": "Surabaya",
            "owner": "Daus",
            "stage": "Belum Dihubungi",
            "dealValue": 3500000,
            "notes": "Butuh website company profile untuk portfolio proyek dan lead form."
        }
    ]
    
    payload = {
        "leads": prospects
    }
    
    # 2. Push data to lead dashboard API
    print("Pushing website prospects to dashboard...")
    try:
        response = requests.post(LEAD_URL, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 201:
            print("Successfully sent leads to dashboard:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Failed to send leads. Status code: {response.status_code}")
            print(response.text)
    except Exception as e:
        print("Error connecting to lead dashboard:", e)

if __name__ == "__main__":
    search_and_push_leads()`;

  const nodeCode = `const fetch = require('node-fetch');

const LEAD_URL = '${endpointUrl}';

async function pushLeads() {
  const prospects = [
    {
      name: 'Klinik Gigi Senyum Sehat',
      phone: '6281122334455',
      industry: 'Klinik & Healthcare',
      location: 'Jakarta',
      owner: 'Daus',
      stage: 'Belum Dihubungi',
      dealValue: 3500000
    }
  ];

  console.log('Sending leads...');
  try {
    const response = await fetch(LEAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: prospects })
    });
    
    if (response.status === 201) {
      const result = await response.json();
      console.log('Successfully imported:', result);
    } else {
      console.error('Failed to import. Status:', response.status);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

pushLeads();`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section className="settingsPage">
      <header className="pageHeader" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#0f172a", margin: "0" }}>Sistem API & Integrasi AI</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0 0" }}>
            Hubungkan otomasi WhatsApp, script AI, scraper, atau bot eksternal langsung ke database prospek website.
          </p>
        </div>
      </header>

      <div className="settingsGrid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", height: "calc(100vh - 160px)", overflowY: "auto", paddingRight: "8px" }}>
        {/* Left Side: API Documentation & JSON Payload */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0 0 14px 0", color: "#0f172a" }}>
              <Database size={16} color="#2563eb" /> API Endpoint
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontFamily: "monospace", fontSize: "13px" }}>
              <span style={{ background: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "4px", fontWeight: "700", fontSize: "11px" }}>POST</span>
              <span style={{ color: "#334155", flex: "1" }}>{endpointUrl}</span>
              <button 
                onClick={() => handleCopy(endpointUrl, "url")} 
                style={{ border: "0", background: "transparent", color: "#94a3b8", display: "flex", alignItems: "center" }}
                title="Salin URL"
              >
                {copiedKey === "url" ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px", lineHeight: "1.5" }}>
              Gunakan endpoint ini untuk memasukkan data prospek baru. Endpoint ini mendukung payload satu data maupun bulk (banyak data sekaligus).
            </p>
          </div>

          {/* JSON Single Lead */}
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0", color: "#0f172a" }}>
                <Terminal size={16} color="#2563eb" /> Contoh JSON (Single Lead)
              </h3>
              <button 
                onClick={() => handleCopy(JSON.stringify(singleLeadJson, null, 2), "single-json")} 
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}
              >
                {copiedKey === "single-json" ? <><Check size={12} color="#16a34a" /> Tersalin</> : <><Copy size={12} /> Salin JSON</>}
              </button>
            </div>
            <pre style={{ margin: "0", background: "#0f172a", color: "#94a3b8", padding: "14px", borderRadius: "8px", fontSize: "12px", overflowX: "auto", fontFamily: "monospace" }}>
              {JSON.stringify(singleLeadJson, null, 2)}
            </pre>
          </div>

          {/* JSON Bulk Leads */}
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0", color: "#0f172a" }}>
                <Terminal size={16} color="#2563eb" /> Contoh JSON (Bulk Leads)
              </h3>
              <button 
                onClick={() => handleCopy(JSON.stringify(bulkLeadsJson, null, 2), "bulk-json")} 
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}
              >
                {copiedKey === "bulk-json" ? <><Check size={12} color="#16a34a" /> Tersalin</> : <><Copy size={12} /> Salin JSON</>}
              </button>
            </div>
            <pre style={{ margin: "0", background: "#0f172a", color: "#94a3b8", padding: "14px", borderRadius: "8px", fontSize: "12px", overflowX: "auto", fontFamily: "monospace" }}>
              {JSON.stringify(bulkLeadsJson, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right Side: Code snippets for Scrapers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Python AI Scraper code */}
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0", color: "#0f172a" }}>
                <Code size={16} color="#2563eb" /> Script AI & Scraper (Python)
              </h3>
              <button 
                onClick={() => handleCopy(pythonCode, "python")} 
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}
              >
                {copiedKey === "python" ? <><Check size={12} color="#16a34a" /> Tersalin</> : <><Copy size={12} /> Salin Script</>}
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "-6px 0 12px 0", lineHeight: "1.4" }}>
              Gunakan script Python ini dalam tool AI Anda untuk mencari prospek baru, memprosesnya menjadi format terstruktur, lalu mengirimkannya langsung ke CRM.
            </p>
            <pre style={{ margin: "0", background: "#0f172a", color: "#94a3b8", padding: "14px", borderRadius: "8px", fontSize: "11.5px", overflowX: "auto", fontFamily: "monospace", maxHeight: "300px", overflowY: "auto" }}>
              {pythonCode}
            </pre>
          </div>

          {/* Node JS implementation */}
          <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", margin: "0", color: "#0f172a" }}>
                <Code size={16} color="#2563eb" /> Script Integrasi (Node.js)
              </h3>
              <button 
                onClick={() => handleCopy(nodeCode, "nodejs")} 
                style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "11px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}
              >
                {copiedKey === "nodejs" ? <><Check size={12} color="#16a34a" /> Tersalin</> : <><Copy size={12} /> Salin Script</>}
              </button>
            </div>
            <pre style={{ margin: "0", background: "#0f172a", color: "#94a3b8", padding: "14px", borderRadius: "8px", fontSize: "11.5px", overflowX: "auto", fontFamily: "monospace", maxHeight: "200px", overflowY: "auto" }}>
              {nodeCode}
            </pre>
          </div>

        </div>
      </div>
    </section>
  );
}
