import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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

interface Participation {
  id: string;
  challengeId: string;
}

const durationInDays = (
  challenge: Challenge
) => {
  const days = Math.ceil(
    (new Date(
      challenge.endDate
    ).getTime() -
      new Date(
        challenge.startDate
      ).getTime()) /
      86400000
  );

  return days > 0 ? days : 1;
};

export default function ChallengesPage() {
  const navigate = useNavigate();

  const [challenges, setChallenges] =
    useState<Challenge[]>([]);

  const [joinedIds, setJoinedIds] =
    useState<Set<string>>(new Set());

  const [balance, setBalance] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [joiningId, setJoiningId] =
    useState<string | null>(null);

  const [joinErrors, setJoinErrors] =
    useState<Record<string, string>>({});

  const [successMessage, setSuccessMessage] =
    useState("");

  const [hoveredId, setHoveredId] =
    useState<string | null>(null);

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const [
          challengeRes,
          myRes,
          meRes,
        ] = await Promise.all([
          api.get("/challenges"),
          api.get("/challenges/my"),
          api.get("/auth/me"),
        ]);

        setChallenges(
          challengeRes.data.challenges ??
            []
        );

        const mine: Participation[] =
          myRes.data.challenges ?? [];

        setJoinedIds(
          new Set(
            mine.map(
              (p) => p.challengeId
            )
          )
        );

        setBalance(
          meRes.data.user?.wallet
            ?.balance ?? null
        );
      } catch (err: any) {
        setLoadError(
          err?.response?.data?.message ||
            "Could not load challenges. Is the server running?"
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  const handleJoin = async (
    challenge: Challenge
  ) => {
    setJoiningId(challenge.id);
    setSuccessMessage("");

    setJoinErrors((prev) => ({
      ...prev,
      [challenge.id]: "",
    }));

    try {
      const response = await api.post(
        `/challenges/${challenge.id}/join`
      );

      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.add(challenge.id);
        return next;
      });

      if (
        response.data.wallet?.balance !==
        undefined
      ) {
        setBalance(
          response.data.wallet.balance
        );
      }

      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challenge.id
            ? {
                ...c,
                _count: {
                  participants:
                    (c._count
                      ?.participants ??
                      0) + 1,
                },
              }
            : c
        )
      );

      setSuccessMessage(
        `You committed ${money(
          challenge.entryFee
        )} to ${challenge.title}.`
      );
    } catch (err: any) {
      setJoinErrors((prev) => ({
        ...prev,
        [challenge.id]:
          err?.response?.data?.message ||
          "Could not join this challenge. Please try again.",
      }));
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Challenges"
        description="Commit a stake to a goal. Show up daily, or lose part of it."
        action={
          balance !== null ? (
            <div
              style={{
                textAlign: "right",
              }}
            >
              <p
                style={{
                  fontSize: font.tiny,
                  color: colour.textFaint,
                  margin: 0,
                }}
              >
                Wallet
              </p>

              <p
                style={{
                  fontSize: font.title,
                  fontWeight:
                    weight.semibold,
                  margin: 0,
                }}
              >
                {money(balance)}
              </p>
            </div>
          ) : undefined
        }
      />

      {successMessage && (
        <Notice tone="accent">
          {successMessage}
        </Notice>
      )}

      {loading && (
        <Muted>
          Loading challenges...
        </Muted>
      )}

      {!loading && loadError && (
        <Notice tone="danger">
          {loadError}
        </Notice>
      )}

      {!loading &&
        !loadError &&
        challenges.length === 0 && (
          <Card
            style={{
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
              No challenges yet
            </h2>

            <Muted>
              Once an admin creates one,
              it appears here.
            </Muted>
          </Card>
        )}

      {!loading && !loadError && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(320px,1fr))",
            gap: space.lg,
          }}
        >
          {challenges.map((challenge) => {
            const joined = joinedIds.has(
              challenge.id
            );

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

            const busy =
              joiningId === challenge.id;

            const disabled =
              joined ||
              closed ||
              cantAfford ||
              busy;

            let buttonLabel = "Join";

            if (busy)
              buttonLabel = "Joining...";
            else if (joined)
              buttonLabel = "Joined";
            else if (closed)
              buttonLabel = "Closed";
            else if (cantAfford)
              buttonLabel =
                "Insufficient balance";

            return (
              <div
                key={challenge.id}
                role="link"
                tabIndex={0}
                onClick={() =>
                  navigate(
                    `/challenges/${challenge.id}`
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" ||
                    e.key === " "
                  ) {
                    e.preventDefault();
                    navigate(
                      `/challenges/${challenge.id}`
                    );
                  }
                }}
                onMouseEnter={() =>
                  setHoveredId(
                    challenge.id
                  )
                }
                onMouseLeave={() =>
                  setHoveredId(null)
                }
                style={{
                  // The whole card opens the challenge, so it has to
                  // say so before the click.
                  cursor: "pointer",
                  borderRadius: "16px",
                  outline: "none",
                }}
              >
              <Card
                style={{
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  borderColor:
                    hoveredId ===
                    challenge.id
                      ? colour.borderStrong
                      : undefined,
                  transition:
                    "border-color 120ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap: space.sm,
                    marginBottom: space.md,
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
                    {challenge.title}
                  </h2>

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
                </div>

                <p
                  style={{
                    color:
                      colour.textMuted,
                    fontSize: font.small,
                    lineHeight: 1.6,
                    margin: `0 0 ${space.lg}`,
                    flex: 1,
                  }}
                >
                  {challenge.description ||
                    "No description provided."}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    borderTop: `1px solid ${colour.border}`,
                    paddingTop: space.md,
                    marginBottom: space.md,
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
                      k: "Duration",
                      v: `${durationInDays(
                        challenge
                      )}d`,
                    },
                    {
                      k: "Joined",
                      v: String(
                        challenge._count
                          ?.participants ??
                          0
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
                    fontSize: font.tiny,
                    color: colour.textFaint,
                    margin: `0 0 ${space.md}`,
                  }}
                >
                  Up to{" "}
                  {challenge.maxMisses}{" "}
                  missed days ·{" "}
                  {
                    challenge.penaltyPercentage
                  }
                  % penalty each
                </p>

                {joinErrors[
                  challenge.id
                ] && (
                  <p
                    style={{
                      color: colour.danger,
                      fontSize: font.small,
                      margin: `0 0 ${space.md}`,
                    }}
                  >
                    {
                      joinErrors[
                        challenge.id
                      ]
                    }
                  </p>
                )}

                <Button
                  onClick={() =>
                    handleJoin(challenge)
                  }
                  stopPropagation
                  disabled={disabled}
                  fullWidth
                  variant={
                    disabled
                      ? "secondary"
                      : "quiet"
                  }
                >
                  {buttonLabel}
                </Button>
              </Card>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
