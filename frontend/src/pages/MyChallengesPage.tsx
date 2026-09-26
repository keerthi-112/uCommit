import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Layout from "../components/Layout";
import api from "../services/api";

import {
  Card,
  Button,
  Input,
  Badge,
  StatTile,
  TileGrid,
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
  radius,
  money,
} from "../theme";

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  entryFee: number;
  penaltyPercentage: number;
  maxMisses: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  completed: boolean;
}

interface Participation {
  id: string;
  challengeId: string;
  misses: number;
  currentStake: number;
  eliminated: boolean;
  joinedAt: string;
  challenge: Challenge;
}

interface Submission {
  id: string;
  proofUrl: string | null;
  submittedAt: string;
  approved: boolean | null;
}

interface SubmissionState {
  today: Submission | null;
  approvedCount: number;
  pendingCount: number;
}

const DAY_MS = 86400000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

const isToday = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();

  return (
    d.getFullYear() ===
      now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const totalDays = (c: Challenge) => {
  const days = Math.ceil(
    (new Date(c.endDate).getTime() -
      new Date(c.startDate).getTime()) /
      DAY_MS
  );

  return days > 0 ? days : 1;
};

const elapsedDays = (c: Challenge) => {
  const elapsed = Math.floor(
    (Date.now() -
      new Date(c.startDate).getTime()) /
      DAY_MS
  );

  const total = totalDays(c);

  if (elapsed < 0) return 0;

  return elapsed > total
    ? total
    : elapsed;
};

type Status =
  | "ELIMINATED"
  | "COMPLETED"
  | "ENDED"
  | "ACTIVE"
  | "NOT_STARTED";

const statusOf = (
  p: Participation
): Status => {
  if (p.eliminated)
    return "ELIMINATED";

  if (p.challenge.completed)
    return "COMPLETED";

  if (
    new Date(
      p.challenge.endDate
    ).getTime() <= Date.now()
  )
    return "ENDED";

  if (
    new Date(
      p.challenge.startDate
    ).getTime() > Date.now()
  )
    return "NOT_STARTED";

  return "ACTIVE";
};

const STATUS: Record<
  Status,
  { label: string; tone: Tone }
> = {
  ELIMINATED: {
    label: "Eliminated",
    tone: "danger",
  },
  COMPLETED: {
    label: "Completed",
    tone: "info",
  },
  ENDED: {
    label: "Awaiting results",
    tone: "warn",
  },
  ACTIVE: {
    label: "Active",
    tone: "accent",
  },
  NOT_STARTED: {
    label: "Starts soon",
    tone: "neutral",
  },
};

export default function MyChallengesPage() {
  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [submissions, setSubmissions] =
    useState<
      Record<string, SubmissionState>
    >({});

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [proofInputs, setProofInputs] =
    useState<Record<string, string>>({});

  const [submittingId, setSubmittingId] =
    useState<string | null>(null);

  const [submitErrors, setSubmitErrors] =
    useState<Record<string, string>>({});

  const loadSubmissions = async (
    challengeId: string
  ) => {
    const res = await api.get(
      `/challenges/${challengeId}/submissions`
    );

    const list: Submission[] =
      res.data.submissions ?? [];

    setSubmissions((prev) => ({
      ...prev,
      [challengeId]: {
        today:
          list.find((s) =>
            isToday(s.submittedAt)
          ) ?? null,
        approvedCount:
          res.data.approvedCount ?? 0,
        pendingCount:
          res.data.pendingCount ?? 0,
      },
    }));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/challenges/my"
        );

        const rows: Participation[] =
          response.data.challenges ?? [];

        setParticipations(rows);

        await Promise.all(
          rows.map((p) =>
            loadSubmissions(
              p.challengeId
            ).catch(() => {})
          )
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Could not load your challenges. Is the server running?"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleSubmitProof = async (
    challengeId: string
  ) => {
    const proofUrl = (
      proofInputs[challengeId] ?? ""
    ).trim();

    if (!proofUrl) {
      setSubmitErrors((prev) => ({
        ...prev,
        [challengeId]:
          "Add a link to your proof first.",
      }));

      return;
    }

    setSubmittingId(challengeId);

    setSubmitErrors((prev) => ({
      ...prev,
      [challengeId]: "",
    }));

    try {
      await api.post(
        `/challenges/${challengeId}/submit`,
        { proofUrl }
      );

      setProofInputs((prev) => ({
        ...prev,
        [challengeId]: "",
      }));

      await loadSubmissions(challengeId);
    } catch (err: any) {
      setSubmitErrors((prev) => ({
        ...prev,
        [challengeId]:
          err?.response?.data?.message ||
          "Could not submit your proof. Please try again.",
      }));
    } finally {
      setSubmittingId(null);
    }
  };

  const activeCount =
    participations.filter(
      (p) => statusOf(p) === "ACTIVE"
    ).length;

  const completedCount =
    participations.filter(
      (p) => statusOf(p) === "COMPLETED"
    ).length;

  const eliminatedCount =
    participations.filter(
      (p) => p.eliminated
    ).length;

  const atStake = participations
    .filter(
      (p) =>
        !p.eliminated &&
        !p.challenge.completed
    )
    .reduce(
      (sum, p) => sum + p.currentStake,
      0
    );

  return (
    <Layout>
      <PageHeader
        title="Journey"
        description="Everything you have committed to, and how it is going."
      />

      {loading && (
        <Muted>
          Loading your journey...
        </Muted>
      )}

      {!loading && error && (
        <Notice tone="danger">
          {error}
        </Notice>
      )}

      {!loading && !error && (
        <>
          <TileGrid>
            <StatTile
              value={String(activeCount)}
              label="Active"
            />
            <StatTile
              value={money(atStake)}
              label="At stake"
            />
            <StatTile
              value={String(
                completedCount
              )}
              label="Completed"
            />
            <StatTile
              value={String(
                eliminatedCount
              )}
              label="Eliminated"
              tone={
                eliminatedCount > 0
                  ? "danger"
                  : undefined
              }
            />
          </TileGrid>

          {participations.length === 0 && (
            <Card
              style={{
                marginTop: space.lg,
                textAlign: "center",
                padding: space["3xl"],
              }}
            >
              <h2
                style={{
                  fontSize: font.heading,
                  fontWeight:
                    weight.semibold,
                  marginBottom: space.sm,
                }}
              >
                Nothing committed yet
              </h2>

              <p
                style={{
                  color:
                    colour.textMuted,
                  fontSize: font.small,
                  marginBottom: space.lg,
                }}
              >
                Join a challenge and it
                will appear here.
              </p>

              <Link to="/challenges">
                Browse challenges
              </Link>
            </Card>
          )}

          {participations.length > 0 && (
            <div
              style={{
                display: "grid",
                gap: space.lg,
                marginTop: space.lg,
              }}
            >
              {participations.map((p) => {
                const status =
                  statusOf(p);

                const meta =
                  STATUS[status];

                const total = totalDays(
                  p.challenge
                );

                const elapsed =
                  elapsedDays(
                    p.challenge
                  );

                const percent =
                  Math.round(
                    (elapsed / total) *
                      100
                  );

                const lost =
                  p.challenge.entryFee -
                  p.currentStake;

                const subs =
                  submissions[
                    p.challengeId
                  ];

                const today =
                  subs?.today ?? null;

                const busy =
                  submittingId ===
                  p.challengeId;

                return (
                  <Card key={p.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap: space.md,
                        flexWrap: "wrap",
                        marginBottom:
                          space.md,
                      }}
                    >
                      <h2
                        style={{
                          fontSize:
                            font.heading,
                          fontWeight:
                            weight.semibold,
                          margin: 0,
                        }}
                      >
                        {
                          p.challenge
                            .title
                        }
                      </h2>

                      <Badge
                        tone={meta.tone}
                      >
                        {meta.label}
                      </Badge>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        fontSize:
                          font.tiny,
                        color:
                          colour.textFaint,
                        marginBottom:
                          space.xs,
                      }}
                    >
                      <span>
                        Day {elapsed} of{" "}
                        {total}
                      </span>
                      <span>
                        {percent}% elapsed
                      </span>
                    </div>

                    <div
                      style={{
                        height: "4px",
                        background:
                          colour.surfaceInput,
                        borderRadius:
                          radius.pill,
                        overflow: "hidden",
                        marginBottom:
                          space.lg,
                      }}
                    >
                      <div
                        style={{
                          width: `${percent}%`,
                          height: "100%",
                          background:
                            p.eliminated
                              ? colour.danger
                              : colour.accent,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit,minmax(120px,1fr))",
                        gap: space.lg,
                      }}
                    >
                      {[
                        {
                          k: "Approved",
                          v: subs
                            ? String(
                                subs.approvedCount
                              )
                            : "—",
                          c: colour.accentText,
                        },
                        {
                          k: "Stake left",
                          v: money(
                            p.currentStake
                          ),
                        },
                        {
                          k: "Misses",
                          v: `${p.misses} of ${p.challenge.maxMisses}`,
                          c:
                            p.misses > 0
                              ? colour.warn
                              : undefined,
                        },
                        {
                          k: "Lost",
                          v: money(lost),
                          c:
                            lost > 0
                              ? colour.danger
                              : undefined,
                        },
                        {
                          k: "Joined",
                          v: formatDate(
                            p.joinedAt
                          ),
                        },
                      ].map((cell) => (
                        <div key={cell.k}>
                          <p
                            style={{
                              fontSize:
                                font.tiny,
                              color:
                                colour.textFaint,
                              margin: 0,
                            }}
                          >
                            {cell.k}
                          </p>

                          <p
                            style={{
                              fontSize:
                                font.body,
                              fontWeight:
                                weight.medium,
                              color:
                                cell.c ??
                                colour.text,
                              margin: 0,
                            }}
                          >
                            {cell.v}
                          </p>
                        </div>
                      ))}
                    </div>

                    {status ===
                      "ACTIVE" && (
                      <div
                        style={{
                          marginTop:
                            space.lg,
                          paddingTop:
                            space.lg,
                          borderTop: `1px solid ${colour.border}`,
                        }}
                      >
                        <p
                          style={{
                            fontSize:
                              font.small,
                            fontWeight:
                              weight.medium,
                            margin: `0 0 ${space.md}`,
                          }}
                        >
                          Today's proof
                        </p>

                        {today ? (
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: space.md,
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <Badge
                              tone={
                                today.approved ===
                                true
                                  ? "accent"
                                  : today.approved ===
                                    false
                                  ? "danger"
                                  : "warn"
                              }
                            >
                              {today.approved ===
                              true
                                ? "Approved"
                                : today.approved ===
                                  false
                                ? "Rejected"
                                : "Awaiting review"}
                            </Badge>

                            {today.proofUrl && (
                              <a
                                href={
                                  today.proofUrl
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
                                  today.proofUrl
                                }
                              </a>
                            )}
                          </div>
                        ) : (
                          <>
                            <div
                              style={{
                                display:
                                  "flex",
                                gap: space.sm,
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  minWidth:
                                    "240px",
                                }}
                              >
                                <Input
                                  value={
                                    proofInputs[
                                      p
                                        .challengeId
                                    ] ?? ""
                                  }
                                  onChange={(
                                    v
                                  ) =>
                                    setProofInputs(
                                      (
                                        prev
                                      ) => ({
                                        ...prev,
                                        [p.challengeId]:
                                          v,
                                      })
                                    )
                                  }
                                  onKeyDown={(
                                    e
                                  ) => {
                                    if (
                                      e.key ===
                                      "Enter"
                                    )
                                      handleSubmitProof(
                                        p.challengeId
                                      );
                                  }}
                                  placeholder="Link to your proof - photo, screenshot, commit..."
                                />
                              </div>

                              <Button
                                onClick={() =>
                                  handleSubmitProof(
                                    p.challengeId
                                  )
                                }
                                disabled={
                                  busy
                                }
                              >
                                {busy
                                  ? "Submitting..."
                                  : "Submit"}
                              </Button>
                            </div>

                            {submitErrors[
                              p.challengeId
                            ] && (
                              <p
                                style={{
                                  color:
                                    colour.danger,
                                  fontSize:
                                    font.small,
                                  marginTop:
                                    space.sm,
                                  marginBottom: 0,
                                }}
                              >
                                {
                                  submitErrors[
                                    p
                                      .challengeId
                                  ]
                                }
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
