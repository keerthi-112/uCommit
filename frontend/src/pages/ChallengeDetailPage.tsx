import { useEffect, useState } from "react";
import {
  useParams,
  Link,
  useNavigate,
} from "react-router-dom";

import Layout from "../components/Layout";
import api from "../services/api";

import {
  Card,
  Button,
  Badge,
  StatTile,
  TileGrid,
  PageHeader,
  Notice,
  Muted,
} from "../components/ui";

import {
  colour,
  space,
  font,
  weight,
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
  _count?: { participants: number };
}

interface Stats {
  totalParticipants: number;
  activeParticipants: number;
  eliminatedParticipants: number;
  rewardPool: number;
}

interface Entry {
  id: string;
  misses: number;
  currentStake: number;
  eliminated: boolean;
  approvedDays: number;
  user: { id: string; name: string };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );

const durationInDays = (c: Challenge) => {
  const days = Math.ceil(
    (new Date(c.endDate).getTime() -
      new Date(c.startDate).getTime()) /
      86400000
  );

  return days > 0 ? days : 1;
};

export default function ChallengeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [challenge, setChallenge] =
    useState<Challenge | null>(null);

  const [stats, setStats] =
    useState<Stats | null>(null);

  const [entries, setEntries] = useState<
    Entry[]
  >([]);

  const [joined, setJoined] =
    useState(false);

  const [balance, setBalance] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [joining, setJoining] =
    useState(false);

  const [joinError, setJoinError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const load = async () => {
    try {
      const [
        challengeRes,
        statsRes,
        boardRes,
        myRes,
        meRes,
      ] = await Promise.all([
        api.get(`/challenges/${id}`),
        api.get(`/challenges/${id}/stats`),
        api.get(
          `/challenges/${id}/leaderboard`
        ),
        api.get("/challenges/my"),
        api.get("/auth/me"),
      ]);

      setChallenge(
        challengeRes.data.challenge
      );

      setStats(statsRes.data);

      setEntries(
        boardRes.data.leaderboard ?? []
      );

      setJoined(
        (
          myRes.data.challenges ?? []
        ).some(
          (p: any) =>
            p.challengeId === id
        )
      );

      setBalance(
        meRes.data.user?.wallet
          ?.balance ?? null
      );
    } catch (err: any) {
      setError(
        err?.response?.status === 404
          ? "That challenge does not exist."
          : err?.response?.data
              ?.message ||
            "Could not load this challenge."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    load();
  }, [id]);

  const handleJoin = async () => {
    if (!challenge) return;

    setJoining(true);
    setJoinError("");

    try {
      await api.post(
        `/challenges/${challenge.id}/join`
      );

      setNotice(
        `You committed ${money(
          challenge.entryFee
        )} to this challenge.`
      );

      await load();
    } catch (err: any) {
      setJoinError(
        err?.response?.data?.message ||
          "Could not join this challenge."
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Muted>
          Loading challenge...
        </Muted>
      </Layout>
    );
  }

  if (error || !challenge) {
    return (
      <Layout>
        <Notice tone="danger">
          {error}
        </Notice>

        <Link to="/challenges">
          Back to challenges
        </Link>
      </Layout>
    );
  }

  const ended =
    new Date(
      challenge.endDate
    ).getTime() <= Date.now();

  const closed =
    challenge.completed ||
    !challenge.isActive ||
    ended;

  const cantAfford =
    balance !== null &&
    balance < challenge.entryFee;

  const disabled =
    joined ||
    closed ||
    cantAfford ||
    joining;

  let label = "Join this challenge";

  if (joining) label = "Joining...";
  else if (joined)
    label = "You have joined";
  else if (challenge.completed)
    label = "Completed";
  else if (closed) label = "Closed";
  else if (cantAfford)
    label = "Insufficient balance";

  return (
    <Layout>
      <Link
        to="/challenges"
        style={{
          fontSize: font.small,
          color: colour.textMuted,
          display: "inline-block",
          marginBottom: space.lg,
        }}
      >
        ← Challenges
      </Link>

      <PageHeader
        title={challenge.title}
        description={
          challenge.description ||
          undefined
        }
        action={
          <Badge
            tone={
              closed
                ? "neutral"
                : "accent"
            }
          >
            {challenge.completed
              ? "Completed"
              : ended
              ? "Ended"
              : !challenge.isActive
              ? "Closed"
              : "Open"}
          </Badge>
        }
      />

      {notice && (
        <Notice tone="accent">
          {notice}
        </Notice>
      )}

      {joinError && (
        <Notice tone="danger">
          {joinError}
        </Notice>
      )}

      {/* The rules --------------------------------------------- */}
      <Card
        style={{
          marginBottom: space.lg,
        }}
      >
        <h2
          style={{
            fontSize: font.heading,
            fontWeight: weight.semibold,
            margin: `0 0 ${space.lg}`,
          }}
        >
          The commitment
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(140px,1fr))",
            gap: space.lg,
            marginBottom: space.lg,
          }}
        >
          {[
            {
              k: "Stake",
              v: money(
                challenge.entryFee
              ),
            },
            {
              k: "Runs for",
              v: `${durationInDays(
                challenge
              )} days`,
            },
            {
              k: "Starts",
              v: formatDate(
                challenge.startDate
              ),
            },
            {
              k: "Ends",
              v: formatDate(
                challenge.endDate
              ),
            },
          ].map((cell) => (
            <div key={cell.k}>
              <p
                style={{
                  fontSize: font.tiny,
                  color: colour.textFaint,
                  margin: 0,
                }}
              >
                {cell.k}
              </p>

              <p
                style={{
                  fontSize: font.body,
                  fontWeight:
                    weight.medium,
                  margin: 0,
                }}
              >
                {cell.v}
              </p>
            </div>
          ))}
        </div>

        <p
          style={{
            color: colour.textMuted,
            fontSize: font.small,
            lineHeight: 1.7,
            margin: `0 0 ${space.lg}`,
            paddingTop: space.lg,
            borderTop: `1px solid ${colour.border}`,
          }}
        >
          Submit proof every day. Miss a
          day and you lose{" "}
          {challenge.penaltyPercentage}%
          of what is left of your stake.
          Miss more than{" "}
          {challenge.maxMisses} and you
          are out, forfeiting the rest to
          everyone still going.
        </p>

        {joinError === "" &&
          cantAfford &&
          !joined &&
          !closed && (
            <p
              style={{
                color: colour.warn,
                fontSize: font.small,
                margin: `0 0 ${space.md}`,
              }}
            >
              Your wallet holds{" "}
              {money(balance ?? 0)}.{" "}
              <Link to="/wallet">
                Add money
              </Link>{" "}
              to join.
            </p>
          )}

        <div
          style={{
            display: "flex",
            gap: space.sm,
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={handleJoin}
            disabled={disabled}
            variant={
              disabled
                ? "secondary"
                : "primary"
            }
          >
            {label}
          </Button>

          {joined && (
            <Button
              variant="secondary"
              onClick={() =>
                navigate("/my-challenges")
              }
            >
              Submit today's proof
            </Button>
          )}
        </div>
      </Card>

      {/* How it is going --------------------------------------- */}
      {stats && (
        <>
          <h2
            style={{
              fontSize: font.title,
              fontWeight: weight.semibold,
              margin: `0 0 ${space.md}`,
            }}
          >
            How it is going
          </h2>

          <TileGrid min="170px">
            <StatTile
              value={String(
                stats.totalParticipants
              )}
              label="Participants"
            />
            <StatTile
              value={String(
                stats.activeParticipants
              )}
              label="Still going"
              tone={
                stats.activeParticipants >
                0
                  ? "accent"
                  : undefined
              }
            />
            <StatTile
              value={String(
                stats.eliminatedParticipants
              )}
              label="Eliminated"
              tone={
                stats.eliminatedParticipants >
                0
                  ? "danger"
                  : undefined
              }
            />
            <StatTile
              value={money(
                stats.rewardPool
              )}
              label="Staked in total"
            />
          </TileGrid>
        </>
      )}

      {/* Leaderboard ------------------------------------------- */}
      <Card
        style={{ marginTop: space.lg }}
      >
        <h2
          style={{
            fontSize: font.heading,
            fontWeight: weight.semibold,
            margin: `0 0 ${space.xs}`,
          }}
        >
          Leaderboard
        </h2>

        <p
          style={{
            color: colour.textFaint,
            fontSize: font.tiny,
            margin: `0 0 ${space.lg}`,
          }}
        >
          Ranked by days shown up, then
          fewest misses.
        </p>

        {entries.length === 0 ? (
          <Muted>
            Nobody has joined yet. You
            could be first.
          </Muted>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: space.md,
                padding: `${space.md} 0`,
                borderBottom:
                  index !==
                  entries.length - 1
                    ? `1px solid ${colour.border}`
                    : "none",
                opacity: entry.eliminated
                  ? 0.5
                  : 1,
              }}
            >
              <span
                style={{
                  width: "24px",
                  color: colour.textFaint,
                  fontSize: font.small,
                  fontVariantNumeric:
                    "tabular-nums",
                }}
              >
                {index + 1}
              </span>

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: font.body,
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
                    fontSize: font.tiny,
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
                  fontSize: font.body,
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
                    fontSize: font.tiny,
                    marginLeft: "4px",
                  }}
                >
                  days
                </span>
              </span>
            </div>
          ))
        )}
      </Card>
    </Layout>
  );
}
