import { useEffect, useState } from "react";

import Layout from "../components/Layout";
import api from "../services/api";

import {
  Card,
  StatTile,
  TileGrid,
  PageHeader,
  Notice,
  Muted,
} from "../components/ui";

import {
  colour,
  space,
  radius,
  font,
  weight,
  money,
} from "../theme";

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
          api.get(
            "/challenges/community"
          ),
          api.get("/challenges"),
        ]);

        setCommunity(communityRes.data);

        const list: Challenge[] =
          challengeRes.data.challenges ??
          [];

        setChallenges(list);

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
          label: "On track",
          value:
            community.cohort.onTrack,
          colour: colour.accent,
        },
        {
          label: "Missed once",
          value:
            community.cohort.missedOnce,
          colour: colour.warn,
        },
        {
          label: "Missed twice or more",
          value:
            community.cohort
              .missedTwice,
          colour: colour.warn,
        },
        {
          label: "Eliminated",
          value:
            community.cohort.eliminated,
          colour: colour.danger,
        },
      ]
    : [];

  const cohortMax = Math.max(
    1,
    ...cohortRows.map((r) => r.value)
  );

  return (
    <Layout>
      <PageHeader
        title="Community"
        description="How everyone else is doing on the commitments they made."
      />

      {loading && (
        <Muted>
          Loading community data...
        </Muted>
      )}

      {!loading && error && (
        <Notice tone="danger">
          {error}
        </Notice>
      )}

      {!loading && !error && community && (
        <>
          <TileGrid>
            <StatTile
              value={community.totalMembers.toLocaleString(
                "en-IN"
              )}
              label="Members"
            />
            <StatTile
              value={String(
                community.activeChallenges
              )}
              label="Challenges running"
            />
            <StatTile
              value={community.totalCommitments.toLocaleString(
                "en-IN"
              )}
              label="Commitments made"
            />
            <StatTile
              value={community.approvedSubmissions.toLocaleString(
                "en-IN"
              )}
              label="Days verified"
              tone="accent"
            />
          </TileGrid>

          <Card
            style={{
              marginTop: space.lg,
              marginBottom: space.lg,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "baseline",
                gap: space.md,
                flexWrap: "wrap",
                marginBottom: space.lg,
              }}
            >
              <h2
                style={{
                  fontSize: font.heading,
                  fontWeight:
                    weight.semibold,
                  margin: 0,
                }}
              >
                Where everyone stands
              </h2>

              <span
                style={{
                  fontSize: font.tiny,
                  color: colour.textFaint,
                }}
              >
                {community.cohort.total}{" "}
                participants in running
                challenges
              </span>
            </div>

            {community.cohort.total ===
            0 ? (
              <Muted>
                No challenges are running
                yet.
              </Muted>
            ) : (
              cohortRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    marginBottom:
                      space.md,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      fontSize:
                        font.small,
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        color:
                          colour.textMuted,
                      }}
                    >
                      {row.label}
                    </span>

                    <span
                      style={{
                        fontWeight:
                          weight.medium,
                      }}
                    >
                      {row.value}
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
                          row.colour,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card>
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: space.md,
                flexWrap: "wrap",
                marginBottom: space.xs,
              }}
            >
              <h2
                style={{
                  fontSize: font.heading,
                  fontWeight:
                    weight.semibold,
                  margin: 0,
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
                    padding: `7px ${space.md}`,
                    borderRadius:
                      radius.sm,
                    background:
                      colour.surfaceInput,
                    border: `1px solid ${colour.border}`,
                    color: colour.text,
                    fontSize: font.small,
                    fontFamily: "inherit",
                    minWidth: "240px",
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
                color: colour.textFaint,
                fontSize: font.tiny,
                margin: `0 0 ${space.lg}`,
              }}
            >
              Ranked by days shown up,
              then fewest misses.
            </p>

            {boardLoading && (
              <Muted>Loading...</Muted>
            )}

            {!boardLoading &&
              entries.length === 0 && (
                <Muted>
                  Nobody has joined this
                  challenge yet.
                </Muted>
              )}

            {!boardLoading &&
              entries.map(
                (entry, index) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      gap: space.md,
                      padding: `${space.md} 0`,
                      borderBottom:
                        index !==
                        entries.length -
                          1
                          ? `1px solid ${colour.border}`
                          : "none",
                      opacity:
                        entry.eliminated
                          ? 0.5
                          : 1,
                    }}
                  >
                    <span
                      style={{
                        width: "24px",
                        color:
                          colour.textFaint,
                        fontSize:
                          font.small,
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {index + 1}
                    </span>

                    <div
                      style={{ flex: 1 }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            font.body,
                          fontWeight:
                            weight.medium,
                        }}
                      >
                        {entry.user.name}
                        {entry.eliminated && (
                          <span
                            style={{
                              color:
                                colour.danger,
                              fontSize:
                                font.tiny,
                              marginLeft:
                                space.sm,
                              fontWeight:
                                weight.regular,
                            }}
                          >
                            eliminated
                          </span>
                        )}
                      </p>

                      <p
                        style={{
                          color:
                            colour.textFaint,
                          fontSize:
                            font.tiny,
                          margin: "2px 0 0",
                        }}
                      >
                        {entry.misses}{" "}
                        {entry.misses === 1
                          ? "miss"
                          : "misses"}{" "}
                        ·{" "}
                        {money(
                          entry.currentStake
                        )}{" "}
                        at stake
                      </p>
                    </div>

                    <span
                      style={{
                        fontSize:
                          font.body,
                        fontWeight:
                          weight.semibold,
                        color:
                          colour.accentText,
                        fontVariantNumeric:
                          "tabular-nums",
                      }}
                    >
                      {entry.approvedDays}
                      <span
                        style={{
                          color:
                            colour.textFaint,
                          fontWeight:
                            weight.regular,
                          fontSize:
                            font.tiny,
                          marginLeft: "4px",
                        }}
                      >
                        days
                      </span>
                    </span>
                  </div>
                )
              )}
          </Card>
        </>
      )}
    </Layout>
  );
}
