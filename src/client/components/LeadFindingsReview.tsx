import React from "react";
import { Check, X, Star, MapPin, Tag, ShieldCheck, HelpCircle } from "lucide-react";
import type { LeadFinding } from "../../shared/types";

interface LeadFindingsReviewProps {
  findings: LeadFinding[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  busy: boolean;
}

export default function LeadFindingsReview({
  findings,
  onApprove,
  onReject,
  busy
}: LeadFindingsReviewProps) {
  const pendingFindings = findings.filter((item) => item.status === "pending");

  const getPriorityBadgeClass = (score: number) => {
    if (score >= 80) return "score-badge high";
    if (score >= 60) return "score-badge medium";
    return "score-badge low";
  };

  return (
    <section className="findingsPage">
      <header className="pageHeader">
        <div>
          <h2>Lead Inbox Queue</h2>
          <p>Validasi temuan prospek AI sebelum diimpor ke data aktif CRM.</p>
        </div>
        <div className="statsBadge">
          <strong>{pendingFindings.length}</strong> Prospek Menunggu Review
        </div>
      </header>

      <div className="findingsGrid">
        {pendingFindings.map((finding) => (
          <article className="findingCard" key={finding.id}>
            <div className="findingCardHeader">
              <div>
                <h3>{finding.name}</h3>
                <span className="findingIndustry">{finding.industry}</span>
              </div>
              <div className={getPriorityBadgeClass(finding.priorityScore)}>
                Score {finding.priorityScore}
              </div>
            </div>

            <div className="findingMeta">
              <div className="metaItem">
                <MapPin size={14} />
                <span>{finding.location}</span>
              </div>
              {finding.rating !== undefined && (
                <div className="metaItem">
                  <Star size={14} className="starIcon" />
                  <span>
                    {finding.rating} ({finding.userRatingsTotal} ulasan)
                  </span>
                </div>
              )}
              <div className="metaItem">
                <Tag size={14} />
                <span>Sumber: {finding.source}</span>
              </div>
            </div>

            <div className="findingDetailSection">
              <div className="detailBlock">
                <h4><ShieldCheck size={14} /> Alasan Kesesuaian (AI Reasoning)</h4>
                <p>{finding.reasonFit}</p>
              </div>

              <div className="detailBlock">
                <h4><HelpCircle size={14} /> Hipotesis Masalah</h4>
                <p>{finding.problemHypothesis}</p>
              </div>

              <div className="offeredProducts">
                <strong>Rekomendasi Produk:</strong>
                <div className="productBadges">
                  {finding.offerMatch.map((prod) => (
                    <span key={prod} className="prodBadge">
                      {prod}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="findingFooter">
              <span className="ownerTag">PIC: {finding.owner}</span>
              <div className="actionButtons">
                <button
                  className="rejectBtn"
                  onClick={() => onReject(finding.id)}
                  disabled={busy}
                >
                  <X size={16} /> Tolak (Reject)
                </button>
                <button
                  className="approveBtn"
                  onClick={() => onApprove(finding.id)}
                  disabled={busy}
                >
                  <Check size={16} /> Setujui (Approve)
                </button>
              </div>
            </div>
          </article>
        ))}

        {pendingFindings.length === 0 && (
          <div className="inboxEmptyState">
            <div className="emptyInboxIcon">✓</div>
            <h3>Semua Prospek Selesai Ditinjau</h3>
            <p>
              Belum ada temuan baru. Buka tab <strong>AI Lead Researcher</strong> untuk meluncurkan pencarian prospek baru.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
