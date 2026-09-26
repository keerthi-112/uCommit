import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import api from "../services/api";

import {
  Card,
  Button,
  Badge,
  PageHeader,
  Notice,
  Muted,
} from "../components/ui";
import type { Tone } from "../components/ui";

import {
  colour,
  space,
  font,
  weight,
} from "../theme";

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
  };
}

const BAND_TONE: Record<string, Tone> = {
  HIGH: "danger",
  MEDIUM: "warn",
  LOW: "neutral",
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
      const confirmed = window.confirm(
        `Reject this proof?\n\n${submission.user.name} loses ${submission.challenge.penaltyPercentage}% of their remaining stake and this counts as a miss (elimination after ${submission.challenge.maxMisses}).\n\nThis cannot be undone.`
      );

      if (!confirmed) return;
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
      <PageHeader
        title="Review"
        description="Proof waiting on a decision, and participation worth a second look."
      />

      {loading && (
        <Muted>
          Loading review queue...
        </Muted>
      )}

      {!loading && error && (
        <Notice tone="danger">
          {error}
        </Notice>
      )}

      {!loading && !error && (
        <>
          {notice && (
            <Notice tone="accent">
              {notice}
            </Notice>
          )}

          {actionError && (
            <Notice tone="danger">
              {actionError}
            </Notice>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: space.sm,
              marginBottom: space.md,
            }}
          >
            <h2
              style={{
                fontSize: font.title,
                fontWeight:
                  weight.semibold,
                margin: 0,
              }}
            >
              Awaiting decision
            </h2>

            <span
              style={{
                color: colour.textFaint,
                fontSize: font.small,
              }}
            >
              {pending.length}
            </span>
          </div>

          {pending.length === 0 ? (
            <Card
              style={{
                marginBottom:
                  space["2xl"],
              }}
            >
              <Muted>
                Nothing is waiting for
                review.
              </Muted>
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gap: space.md,
                marginBottom:
                  space["2xl"],
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
                    <Card
                      key={submission.id}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: space.md,
                          flexWrap:
                            "wrap",
                          marginBottom:
                            space.sm,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize:
                                font.body,
                              fontWeight:
                                weight.medium,
                            }}
                          >
                            {
                              submission
                                .user.name
                            }
                          </p>

                          <p
                            style={{
                              color:
                                colour.textFaint,
                              fontSize:
                                font.tiny,
                              margin:
                                "2px 0 0",
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
                            <Badge
                              tone={
                                BAND_TONE[
                                  risk
                                    .band
                                ]
                              }
                            >
                              {risk.band}{" "}
                              risk ·{" "}
                              {
                                risk.riskScore
                              }
                            </Badge>
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
                            fontSize:
                              font.small,
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
                              margin: `${space.md} 0 0`,
                              paddingLeft:
                                "18px",
                              color:
                                colour.warn,
                              fontSize:
                                font.small,
                              lineHeight: 1.6,
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
                          gap: space.sm,
                          marginTop:
                            space.lg,
                        }}
                      >
                        <Button
                          onClick={() =>
                            review(
                              submission,
                              "approve"
                            )
                          }
                          disabled={busy}
                        >
                          {busy
                            ? "Saving..."
                            : "Approve"}
                        </Button>

                        <Button
                          variant="danger"
                          onClick={() =>
                            review(
                              submission,
                              "reject"
                            )
                          }
                          disabled={busy}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  );
                }
              )}
            </div>
          )}

          {/* Risk ------------------------------------------------ */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: space.sm,
              marginBottom: space.xs,
            }}
          >
            <h2
              style={{
                fontSize: font.title,
                fontWeight:
                  weight.semibold,
                margin: 0,
              }}
            >
              Risk signals
            </h2>

            <span
              style={{
                color: colour.textFaint,
                fontSize: font.small,
              }}
            >
              {flagged.length} of{" "}
              {population} participants
            </span>
          </div>

          <p
            style={{
              color: colour.textFaint,
              fontSize: font.tiny,
              lineHeight: 1.6,
              maxWidth: "70ch",
              margin: `0 0 ${space.lg}`,
            }}
          >
            These are review signals, not
            conclusions. Nothing here
            applies a penalty on its own.{" "}
            {modelUsed
              ? "Scored with the explainable rules plus an anomaly model fitted to this population."
              : queueNote}
          </p>

          {flagged.length === 0 ? (
            <Card>
              <Muted>
                No participation is
                currently flagged.
              </Muted>
            </Card>
          ) : (
            <div
              style={{
                display: "grid",
                gap: space.md,
              }}
            >
              {flagged.map((a) => (
                <Card
                  key={
                    a.userId +
                    a.challengeId
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: space.md,
                      flexWrap: "wrap",
                      marginBottom:
                        space.sm,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            font.body,
                          fontWeight:
                            weight.medium,
                        }}
                      >
                        {a.userName}
                      </p>

                      <p
                        style={{
                          color:
                            colour.textFaint,
                          fontSize:
                            font.tiny,
                          margin:
                            "2px 0 0",
                        }}
                      >
                        {
                          a.challengeTitle
                        }{" "}
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

                    <Badge
                      tone={
                        BAND_TONE[a.band]
                      }
                    >
                      {a.band} ·{" "}
                      {a.riskScore}
                    </Badge>
                  </div>

                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "18px",
                      color:
                        colour.textMuted,
                      fontSize: font.small,
                      lineHeight: 1.7,
                    }}
                  >
                    {a.reasons.map((r) => (
                      <li key={r.code}>
                        {r.explanation}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
