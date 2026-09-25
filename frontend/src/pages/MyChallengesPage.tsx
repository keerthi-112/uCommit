import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import Layout from "../components/Layout";
import api from "../services/api";

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

const cardStyle = {
  background: "#111827",
  border: "1px solid #1E293B",
  borderRadius: "22px",
  padding: "24px",
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.25)",
};

const DAY_MS = 1000 * 60 * 60 * 24;

const formatMoney = (value: number) =>
  "₹" +
  value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

/** Total length of the challenge window, in whole days (minimum 1). */
const totalDays = (
  challenge: Challenge
) => {
  const days = Math.ceil(
    (new Date(
      challenge.endDate
    ).getTime() -
      new Date(
        challenge.startDate
      ).getTime()) /
      DAY_MS
  );

  return days > 0 ? days : 1;
};

/**
 * How far through the challenge window we are today, in days.
 * This is elapsed time, not days completed - the backend does not
 * yet expose per-user submission history.
 */
const elapsedDays = (
  challenge: Challenge
) => {
  const elapsed = Math.floor(
    (Date.now() -
      new Date(
        challenge.startDate
      ).getTime()) /
      DAY_MS
  );

  const total = totalDays(challenge);

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

const STATUS_STYLES: Record<
  Status,
  { label: string; color: string; bg: string }
> = {
  ELIMINATED: {
    label: "Eliminated",
    color: "#FCA5A5",
    bg: "rgba(239,68,68,0.15)",
  },
  COMPLETED: {
    label: "Completed",
    color: "#93C5FD",
    bg: "rgba(96,165,250,0.15)",
  },
  ENDED: {
    label: "Awaiting Results",
    color: "#FCD34D",
    bg: "rgba(245,158,11,0.15)",
  },
  ACTIVE: {
    label: "Active",
    color: "#4ADE80",
    bg: "rgba(34,197,94,0.15)",
  },
  NOT_STARTED: {
    label: "Starts Soon",
    color: "#94A3B8",
    bg: "rgba(148,163,184,0.15)",
  },
};

export default function MyChallengesPage() {
  const [participations, setParticipations] =
    useState<Participation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/challenges/my"
        );

        setParticipations(
          response.data.challenges ?? []
        );
      } catch (err: any) {
        setError(
          err?.response?.data
            ?.message ||
            "Could not load your challenges. Is the server running?"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Every figure below is derived from the participation rows above.
  const activeCount =
    participations.filter(
      (p) => statusOf(p) === "ACTIVE"
    ).length;

  const completedCount =
    participations.filter(
      (p) =>
        statusOf(p) === "COMPLETED"
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

  const overview = [
    {
      label: "Active Journeys",
      value: String(activeCount),
    },
    {
      label: "Currently At Stake",
      value: formatMoney(atStake),
    },
    {
      label: "Challenges Completed",
      value: String(completedCount),
    },
    {
      label: "Eliminated",
      value: String(eliminatedCount),
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div
        style={{
          marginBottom: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            marginBottom: "16px",
          }}
        >
          My Journey
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "20px",
            maxWidth: "800px",
            lineHeight: 1.8,
          }}
        >
          Every completed day is a vote
          for the person you want to
          become.
        </p>
      </div>

      {loading && (
        <p
          style={{
            color: "#94A3B8",
            fontSize: "18px",
          }}
        >
          Loading your journey...
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
          {/* Personal overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            {overview.map((item) => (
              <div
                key={item.label}
                style={cardStyle}
              >
                <p
                  style={{
                    color: "#94A3B8",
                  }}
                >
                  {item.label}
                </p>

                <h2
                  style={{
                    marginTop: "10px",
                    fontSize: "34px",
                  }}
                >
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {participations.length ===
            0 && (
            <div
              style={{
                ...cardStyle,
                padding: "60px 28px",
                textAlign:
                  "center" as const,
              }}
            >
              <h2
                style={{
                  marginBottom: "12px",
                }}
              >
                Your journey hasn't
                started yet
              </h2>

              <p
                style={{
                  color: "#94A3B8",
                  lineHeight: 1.7,
                  marginBottom: "24px",
                }}
              >
                Commit to a challenge
                and it will appear here.
              </p>

              <Link
                to="/challenges"
                style={{
                  display:
                    "inline-block",
                  background:
                    "linear-gradient(135deg,#22C55E,#4ADE80)",
                  color: "#081018",
                  padding: "14px 26px",
                  borderRadius: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Browse Challenges
              </Link>
            </div>
          )}

          {/* Journeys */}
          {participations.length > 0 && (
            <>
              <h2
                style={{
                  marginBottom: "24px",
                  fontSize: "30px",
                }}
              >
                Your Journeys
              </h2>

              <div
                style={{
                  display: "grid",
                  gap: "24px",
                }}
              >
                {participations.map(
                  (p) => {
                    const status =
                      statusOf(p);

                    const style =
                      STATUS_STYLES[
                        status
                      ];

                    const total =
                      totalDays(
                        p.challenge
                      );

                    const elapsed =
                      elapsedDays(
                        p.challenge
                      );

                    const percent =
                      Math.round(
                        (elapsed /
                          total) *
                          100
                      );

                    const lost =
                      p.challenge
                        .entryFee -
                      p.currentStake;

                    return (
                      <motion.div
                        key={p.id}
                        whileHover={{
                          y: -5,
                        }}
                        style={{
                          ...cardStyle,
                          borderRadius:
                            "24px",
                          padding: "28px",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap: "16px",
                            flexWrap:
                              "wrap",
                            marginBottom:
                              "20px",
                          }}
                        >
                          <h2>
                            {
                              p.challenge
                                .title
                            }
                          </h2>

                          <span
                            style={{
                              padding:
                                "6px 14px",
                              borderRadius:
                                "999px",
                              background:
                                style.bg,
                              color:
                                style.color,
                              fontWeight: 700,
                              fontSize:
                                "14px",
                            }}
                          >
                            {style.label}
                          </span>
                        </div>

                        <p
                          style={{
                            color:
                              "#94A3B8",
                            marginBottom:
                              "12px",
                          }}
                        >
                          Day {elapsed} of{" "}
                          {total}{" "}
                          <span
                            style={{
                              color:
                                "#64748B",
                            }}
                          >
                            (time elapsed)
                          </span>
                        </p>

                        <div
                          style={{
                            height: "14px",
                            background:
                              "#1E293B",
                            borderRadius:
                              "999px",
                            overflow:
                              "hidden",
                            marginBottom:
                              "20px",
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              background:
                                p.eliminated
                                  ? "#7F1D1D"
                                  : "linear-gradient(90deg,#22C55E,#60A5FA)",
                              height:
                                "100%",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit,minmax(160px,1fr))",
                            gap: "16px",
                            marginBottom:
                              "8px",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "14px",
                              }}
                            >
                              Stake
                              remaining
                            </p>

                            <p
                              style={{
                                fontSize:
                                  "20px",
                                fontWeight: 700,
                              }}
                            >
                              {formatMoney(
                                p.currentStake
                              )}
                            </p>
                          </div>

                          <div>
                            <p
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "14px",
                              }}
                            >
                              Misses used
                            </p>

                            <p
                              style={{
                                fontSize:
                                  "20px",
                                fontWeight: 700,
                                color:
                                  p.misses >
                                  0
                                    ? "#FCD34D"
                                    : "#F8FAFC",
                              }}
                            >
                              {p.misses}{" "}
                              of{" "}
                              {
                                p.challenge
                                  .maxMisses
                              }
                            </p>
                          </div>

                          <div>
                            <p
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "14px",
                              }}
                            >
                              Lost to
                              penalties
                            </p>

                            <p
                              style={{
                                fontSize:
                                  "20px",
                                fontWeight: 700,
                                color:
                                  lost > 0
                                    ? "#FCA5A5"
                                    : "#F8FAFC",
                              }}
                            >
                              {formatMoney(
                                lost
                              )}
                            </p>
                          </div>

                          <div>
                            <p
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "14px",
                              }}
                            >
                              Joined
                            </p>

                            <p
                              style={{
                                fontSize:
                                  "20px",
                                fontWeight: 700,
                              }}
                            >
                              {formatDate(
                                p.joinedAt
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
