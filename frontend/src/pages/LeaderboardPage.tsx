import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import Layout from "../components/Layout";
import api from "../services/api";

interface Community {
  totalMembers: number;
  activeChallenges: number;
  totalCommitments: number;
  approvedSubmissions: number;
  cohort: {
    onTrack: number;
    missedOnce: number;
    missedTwice: number;
    eliminated: number;
    total: number;
  };
}

interface Challenge {
  id: string;
  title: string;
  completed: boolean;
  _count?: { participants: number };
}

interface Entry {
  id: string;
  misses: number;
  currentStake: number;
  eliminated: boolean;
  approvedDays: number;
  user: { id: string; name: string };
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1E293B",
  borderRadius: "24px",
  padding: "28px",
};

const formatMoney = (value: number) =>
  "₹" +
  value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function LeaderboardPage() {
  const [community, setCommunity] =
    useState<Community | null>(null);

  const [challenges, setChallenges] =
    useState<Challenge[]>([]);

  const [selectedId, setSelectedId] =
    useState("");

  const [entries, setEntries] = useState<
    Entry[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [boardLoading, setBoardLoading] =
    useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [
          communityRes,
          challengeRes,
        ] = await Promise.all([
          api.get("/challenges/community"),
          api.get("/challenges"),
        ]);

        setCommunity(communityRes.data);

        const list: Challenge[] =
          challengeRes.data.challenges ??
          [];

        setChallenges(list);

        // Default to the one with the most participants - the most
        // interesting board to land on.
        const best = [...list].sort(
          (a, b) =>
            (b._count?.participants ??
              0) -
            (a._count?.participants ?? 0)
        )[0];

        if (best) setSelectedId(best.id);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Could not load community data. Is the server running?"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const loadBoard = async () => {
      setBoardLoading(true);

      try {
        const res = await api.get(
          `/challenges/${selectedId}/leaderboard`
        );

        setEntries(
          res.data.leaderboard ?? []
        );
      } catch {
        setEntries([]);
      } finally {
        setBoardLoading(false);
      }
    };

    loadBoard();
  }, [selectedId]);

  const cohortRows = community
    ? [
        {
          label: "Currently On Track",
          value: community.cohort.onTrack,
          color: "#22C55E",
        },
        {
          label: "Missed Once",
          value:
            community.cohort.missedOnce,
          color: "#F59E0B",
        },
        {
          label: "Missed Twice Or More",
          value:
            community.cohort.missedTwice,
          color: "#FB923C",
        },
        {
          label: "Eliminated",
          value:
            community.cohort.eliminated,
          color: "#EF4444",
        },
      ]
    : [];

  const cohortMax = Math.max(
    1,
    ...cohortRows.map((r) => r.value)
  );

  return (
    <Layout>
      <div
        style={{ marginBottom: "44px" }}
      >
        <h1
          style={{
            fontSize: "52px",
            fontWeight: 800,
            marginBottom: "16px",
          }}
        >
          Community Insights
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "19px",
            maxWidth: "850px",
            lineHeight: 1.8,
          }}
        >
          People who chose discipline when
          motivation wasn't enough.
        </p>
      </div>

      {loading && (
        <p style={{ color: "#94A3B8" }}>
          Loading community data...
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

      {!loading && !error && community && (
        <>
          {/* Community totals */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(240px,1fr))",
              gap: "20px",
              marginBottom: "36px",
            }}
          >
            {[
              {
                label: "Members",
                value:
                  community.totalMembers,
              },
              {
                label:
                  "Challenges In Progress",
                value:
                  community.activeChallenges,
              },
              {
                label:
                  "Commitments Made",
                value:
                  community.totalCommitments,
              },
              {
                label:
                  "Days Verified",
                value:
                  community.approvedSubmissions,
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                whileHover={{ y: -6 }}
                style={cardStyle}
              >
                <p
                  style={{
                    color: "#94A3B8",
                    marginBottom: "8px",
                  }}
                >
                  {item.label}
                </p>

                <h2
                  style={{
                    fontSize: "34px",
                  }}
                >
                  {item.value.toLocaleString(
                    "en-IN"
                  )}
                </h2>
              </motion.div>
            ))}
          </div>

          {/* Cohort breakdown */}
          <div
            style={{
              ...cardStyle,
              marginBottom: "36px",
            }}
          >
            <h2
              style={{
                marginBottom: "6px",
                fontSize: "26px",
              }}
            >
              Where Everyone Stands
            </h2>

            <p
              style={{
                color: "#64748B",
                marginBottom: "28px",
                fontSize: "14px",
              }}
            >
              {community.cohort.total}{" "}
              participants across
              challenges still running.
            </p>

            {community.cohort.total ===
            0 ? (
              <p
                style={{
                  color: "#94A3B8",
                }}
              >
                No challenges are running
                yet.
              </p>
            ) : (
              cohortRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    marginBottom: "22px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      marginBottom: "8px",
                    }}
                  >
                    <span>
                      {row.label}
                    </span>

                    <span
                      style={{
                        fontWeight: 700,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>

                  <div
                    style={{
                      height: "14px",
                      background: "#1E293B",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          (row.value /
                            cohortMax) *
                          100
                        }%`,
                        height: "100%",
                        background:
                          row.color,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Per challenge leaderboard */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                marginBottom: "8px",
              }}
            >
              <h2
                style={{
                  fontSize: "26px",
                }}
              >
                Leaderboard
              </h2>

              {challenges.length > 0 && (
                <select
                  value={selectedId}
                  onChange={(e) =>
                    setSelectedId(
                      e.target.value
                    )
                  }
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: "#0B1220",
                    border:
                      "1px solid #1E293B",
                    color: "#F8FAFC",
                    fontSize: "15px",
                    minWidth: "260px",
                  }}
                >
                  {challenges.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p
              style={{
                color: "#64748B",
                fontSize: "14px",
                marginBottom: "24px",
              }}
            >
              Ranked by days shown up,
              then fewest misses.
            </p>

            {boardLoading && (
              <p
                style={{ color: "#94A3B8" }}
              >
                Loading...
              </p>
            )}

            {!boardLoading &&
              entries.length === 0 && (
                <p
                  style={{
                    color: "#94A3B8",
                  }}
                >
                  Nobody has joined this
                  challenge yet.
                </p>
              )}

            {!boardLoading &&
              entries.map(
                (entry, index) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 0",
                      borderBottom:
                        index !==
                        entries.length - 1
                          ? "1px solid #1E293B"
                          : "none",
                      opacity:
                        entry.eliminated
                          ? 0.55
                          : 1,
                    }}
                  >
                    <span
                      style={{
                        width: "34px",
                        color: "#64748B",
                        fontWeight: 700,
                        fontSize: "17px",
                      }}
                    >
                      {index + 1}
                    </span>

                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          margin: 0,
                          fontWeight: 600,
                          fontSize: "16px",
                        }}
                      >
                        {entry.user.name}
                        {entry.eliminated && (
                          <span
                            style={{
                              color:
                                "#FCA5A5",
                              fontSize:
                                "13px",
                              marginLeft:
                                "10px",
                            }}
                          >
                            eliminated
                          </span>
                        )}
                      </p>

                      <p
                        style={{
                          color: "#64748B",
                          fontSize: "13px",
                          marginTop: "4px",
                        }}
                      >
                        {entry.misses}{" "}
                        {entry.misses === 1
                          ? "miss"
                          : "misses"}{" "}
                        ·{" "}
                        {formatMoney(
                          entry.currentStake
                        )}{" "}
                        at stake
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "22px",
                          fontWeight: 700,
                          color: "#4ADE80",
                        }}
                      >
                        {
                          entry.approvedDays
                        }
                      </p>

                      <p
                        style={{
                          color: "#64748B",
                          fontSize: "12px",
                          margin: 0,
                        }}
                      >
                        days
                      </p>
                    </div>
                  </div>
                )
              )}
          </div>
        </>
      )}
    </Layout>
  );
}
