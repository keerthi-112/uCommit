import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import Layout from "../components/Layout";
import api from "../services/api";

interface PendingSubmission {
  id: string;
  proofUrl: string | null;
  submittedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  challenge: {
    id: string;
    title: string;
    penaltyPercentage: number;
    maxMisses: number;
  };
}

interface Reason {
  code: string;
  weight: number;
  explanation: string;
}

interface Assessment {
  userId: string;
  userName: string;
  challengeId: string;
  challengeTitle: string;
  riskScore: number;
  band: "LOW" | "MEDIUM" | "HIGH";
  reasons: Reason[];
  anomalyScore: number | null;
  features: {
    submissionCount: number;
    duplicateRatio: number;
    rejectionRate: number;
  };
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1E293B",
  borderRadius: "22px",
  padding: "24px",
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.25)",
};

const BAND_STYLES: Record<
  string,
  { color: string; bg: string }
> = {
  HIGH: {
    color: "#FCA5A5",
    bg: "rgba(239,68,68,0.15)",
  },
  MEDIUM: {
    color: "#FCD34D",
    bg: "rgba(245,158,11,0.15)",
  },
  LOW: {
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.12)",
  },
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function AdminReviewPage() {
  const [pending, setPending] = useState<
    PendingSubmission[]
  >([]);

  const [assessments, setAssessments] =
    useState<Assessment[]>([]);

  const [queueNote, setQueueNote] =
    useState("");

  const [modelUsed, setModelUsed] =
    useState(false);

  const [population, setPopulation] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [actingId, setActingId] =
    useState<string | null>(null);

  const [actionError, setActionError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const load = async () => {
    setError("");

    try {
      const [pendingRes, fraudRes] =
        await Promise.all([
          api.get("/challenges/pending"),
          api.get("/fraud/review"),
        ]);

      setPending(
        pendingRes.data.submissions ?? []
      );

      setAssessments(
        fraudRes.data.assessments ?? []
      );

      setQueueNote(
        fraudRes.data.note ?? ""
      );

      setModelUsed(
        Boolean(fraudRes.data.modelUsed)
      );

      setPopulation(
        fraudRes.data.population ?? 0
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Could not load the review queue. Is the server running?"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Risk information for the person who submitted this proof. */
  const riskFor = (
    submission: PendingSubmission
  ) =>
    assessments.find(
      (a) =>
        a.userId === submission.user.id &&
        a.challengeId ===
          submission.challenge.id
    );

  const review = async (
    submission: PendingSubmission,
    decision: "approve" | "reject"
  ) => {
    if (decision === "reject") {
      const ok = window.confirm(
        `Reject this proof?\n\n` +
          `${submission.user.name} loses ${submission.challenge.penaltyPercentage}% of their remaining stake and this counts as a miss ` +
          `(elimination after ${submission.challenge.maxMisses}).\n\nThis cannot be undone.`
      );

      if (!ok) return;
    }

    setActingId(submission.id);
    setActionError("");
    setNotice("");

    try {
      await api.post(
        `/challenges/submissions/${submission.id}/${decision}`
      );

      setNotice(
        decision === "approve"
          ? `Approved ${submission.user.name}'s proof.`
          : `Rejected ${submission.user.name}'s proof. A penalty and a miss were applied.`
      );

      await load();
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message ||
          "Could not record that decision."
      );
    } finally {
      setActingId(null);
    }
  };

  const flagged = assessments.filter(
    (a) => a.band !== "LOW"
  );

  return (
    <Layout>
      <div
        style={{ marginBottom: "36px" }}
      >
        <h1
          style={{
            fontSize: "52px",
            fontWeight: 800,
            marginBottom: "14px",
          }}
        >
          Review
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "19px",
            maxWidth: "820px",
            lineHeight: 1.7,
          }}
        >
          Proof waiting on a decision, and
          participation worth a second
          look.
        </p>
      </div>

      {loading && (
        <p
          style={{
            color: "#94A3B8",
            fontSize: "18px",
          }}
        >
          Loading review queue...
        </p>
      )}

      {!loading && error && (
        <div
          style={{
            padding: "20px 24px",
            borderRadius: "16px",
            background:
              "rgba(239,68,68,0.1)",
            border:
              "1px solid rgba(239,68,68,0.3)",
            color: "#FCA5A5",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {notice && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                borderRadius: "16px",
                background:
                  "rgba(34,197,94,0.12)",
                border:
                  "1px solid rgba(34,197,94,0.3)",
                color: "#4ADE80",
              }}
            >
              {notice}
            </div>
          )}

          {actionError && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                borderRadius: "16px",
                background:
                  "rgba(239,68,68,0.1)",
                border:
                  "1px solid rgba(239,68,68,0.3)",
                color: "#FCA5A5",
              }}
            >
              {actionError}
            </div>
          )}

          {/* ---------------- Pending proof ---------------- */}
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "18px",
            }}
          >
            Awaiting decision
            <span
              style={{
                color: "#64748B",
                fontSize: "18px",
                fontWeight: 400,
                marginLeft: "10px",
              }}
            >
              {pending.length}
            </span>
          </h2>

          {pending.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                marginBottom: "48px",
                color: "#94A3B8",
              }}
            >
              Nothing is waiting for
              review right now.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
                marginBottom: "48px",
              }}
            >
              {pending.map(
                (submission) => {
                  const risk =
                    riskFor(submission);

                  const busy =
                    actingId ===
                    submission.id;

                  return (
                    <motion.div
                      key={submission.id}
                      whileHover={{
                        y: -3,
                      }}
                      style={cardStyle}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          gap: "14px",
                          flexWrap: "wrap",
                          marginBottom:
                            "14px",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              fontSize:
                                "20px",
                              marginBottom:
                                "4px",
                            }}
                          >
                            {
                              submission
                                .user.name
                            }
                          </h3>

                          <p
                            style={{
                              color:
                                "#64748B",
                              fontSize:
                                "14px",
                            }}
                          >
                            {
                              submission
                                .challenge
                                .title
                            }{" "}
                            ·{" "}
                            {formatWhen(
                              submission.submittedAt
                            )}
                          </p>
                        </div>

                        {risk &&
                          risk.band !==
                            "LOW" && (
                            <span
                              style={{
                                padding:
                                  "6px 14px",
                                borderRadius:
                                  "999px",
                                fontWeight: 700,
                                fontSize:
                                  "13px",
                                background:
                                  BAND_STYLES[
                                    risk
                                      .band
                                  ].bg,
                                color:
                                  BAND_STYLES[
                                    risk
                                      .band
                                  ].color,
                              }}
                            >
                              {risk.band}{" "}
                              RISK ·{" "}
                              {
                                risk.riskScore
                              }
                            </span>
                          )}
                      </div>

                      {submission.proofUrl && (
                        <a
                          href={
                            submission.proofUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color:
                              "#60A5FA",
                            fontSize:
                              "14px",
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {
                            submission.proofUrl
                          }
                        </a>
                      )}

                      {risk &&
                        risk.reasons
                          .length > 0 && (
                          <ul
                            style={{
                              margin:
                                "14px 0 0",
                              paddingLeft:
                                "20px",
                              color:
                                "#FCD34D",
                              fontSize:
                                "14px",
                              lineHeight: 1.7,
                            }}
                          >
                            {risk.reasons.map(
                              (r) => (
                                <li
                                  key={
                                    r.code
                                  }
                                >
                                  {
                                    r.explanation
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        )}

                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          marginTop:
                            "20px",
                        }}
                      >
                        <button
                          onClick={() =>
                            review(
                              submission,
                              "approve"
                            )
                          }
                          disabled={busy}
                          style={{
                            background:
                              busy
                                ? "#1E293B"
                                : "linear-gradient(135deg,#22C55E,#4ADE80)",
                            color: busy
                              ? "#64748B"
                              : "#081018",
                            border: "none",
                            padding:
                              "12px 24px",
                            borderRadius:
                              "12px",
                            fontWeight: 700,
                            cursor: busy
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          {busy
                            ? "Saving..."
                            : "Approve"}
                        </button>

                        <button
                          onClick={() =>
                            review(
                              submission,
                              "reject"
                            )
                          }
                          disabled={busy}
                          style={{
                            background:
                              "transparent",
                            color:
                              "#FCA5A5",
                            border:
                              "1px solid rgba(239,68,68,0.4)",
                            padding:
                              "12px 24px",
                            borderRadius:
                              "12px",
                            fontWeight: 700,
                            cursor: busy
                              ? "not-allowed"
                              : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </div>
          )}

          {/* ---------------- Risk queue ---------------- */}
          <h2
            style={{
              fontSize: "28px",
              marginBottom: "10px",
            }}
          >
            Risk signals
            <span
              style={{
                color: "#64748B",
                fontSize: "18px",
                fontWeight: 400,
                marginLeft: "10px",
              }}
            >
              {flagged.length} of{" "}
              {population} participants
            </span>
          </h2>

          <p
            style={{
              color: "#64748B",
              fontSize: "14px",
              lineHeight: 1.7,
              maxWidth: "820px",
              marginBottom: "20px",
            }}
          >
            These are review signals, not
            conclusions. Nothing here
            applies a penalty on its own.
            <br />
            {modelUsed
              ? "Scored with the explainable rules plus an anomaly model fitted to this population."
              : queueNote}
          </p>

          {flagged.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                color: "#94A3B8",
              }}
            >
              No participation is
              currently flagged.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "16px",
              }}
            >
              {flagged.map((a) => (
                <div
                  key={
                    a.userId +
                    a.challengeId
                  }
                  style={cardStyle}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "14px",
                      flexWrap: "wrap",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "20px",
                          marginBottom:
                            "4px",
                        }}
                      >
                        {a.userName}
                      </h3>

                      <p
                        style={{
                          color: "#64748B",
                          fontSize: "14px",
                        }}
                      >
                        {a.challengeTitle}{" "}
                        ·{" "}
                        {
                          a.features
                            .submissionCount
                        }{" "}
                        submissions
                        {a.anomalyScore !==
                          null &&
                          ` · anomaly ${a.anomalyScore}`}
                      </p>
                    </div>

                    <span
                      style={{
                        padding:
                          "6px 14px",
                        borderRadius:
                          "999px",
                        fontWeight: 700,
                        fontSize: "13px",
                        background:
                          BAND_STYLES[
                            a.band
                          ].bg,
                        color:
                          BAND_STYLES[
                            a.band
                          ].color,
                      }}
                    >
                      {a.band} · {a.riskScore}
                    </span>
                  </div>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      color: "#CBD5E1",
                      fontSize: "15px",
                      lineHeight: 1.8,
                    }}
                  >
                    {a.reasons.map((r) => (
                      <li key={r.code}>
                        {r.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
