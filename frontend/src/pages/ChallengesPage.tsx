import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
  _count?: {
    participants: number;
  };
}

interface Participation {
  id: string;
  challengeId: string;
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1E293B",
  borderRadius: "24px",
  padding: "28px",
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.25)",
  display: "flex",
  flexDirection: "column" as const,
};

/** Whole days between start and end, minimum 1. */
const durationInDays = (
  challenge: Challenge
) => {
  const start = new Date(
    challenge.startDate
  ).getTime();

  const end = new Date(
    challenge.endDate
  ).getTime();

  const days = Math.ceil(
    (end - start) /
      (1000 * 60 * 60 * 24)
  );

  return days > 0 ? days : 1;
};

const formatMoney = (value: number) =>
  "₹" +
  value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function ChallengesPage() {
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

  // id of the challenge currently being joined
  const [joiningId, setJoiningId] =
    useState<string | null>(null);

  // per-card error message, keyed by challenge id
  const [joinErrors, setJoinErrors] =
    useState<Record<string, string>>(
      {}
    );

  const [successMessage, setSuccessMessage] =
    useState("");

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
          challengeRes.data
            .challenges ?? []
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
          err?.response?.data
            ?.message ||
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

      // The server returns the authoritative wallet after the debit.
      if (
        response.data.wallet?.balance !==
        undefined
      ) {
        setBalance(
          response.data.wallet.balance
        );
      }

      // Keep the participant count honest without a full refetch.
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
        `You committed ${formatMoney(
          challenge.entryFee
        )} to "${challenge.title}".`
      );
    } catch (err: any) {
      setJoinErrors((prev) => ({
        ...prev,
        [challenge.id]:
          err?.response?.data
            ?.message ||
          "Could not join this challenge. Please try again.",
      }));
    } finally {
      setJoiningId(null);
    }
  };

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
          Challenges
        </h1>

        <p
          style={{
            fontSize: "20px",
            color: "#94A3B8",
            maxWidth: "800px",
            lineHeight: 1.8,
          }}
        >
          Consistency isn't talent.

          <br />
          <br />

          It's a decision made every
          day.
        </p>

        {balance !== null && (
          <div
            style={{
              display:
                "inline-block",
              marginTop: "28px",
              padding: "10px 18px",
              borderRadius: "999px",
              background:
                "rgba(34,197,94,0.12)",
              border:
                "1px solid rgba(34,197,94,0.25)",
              color: "#4ADE80",
              fontWeight: 600,
            }}
          >
            Wallet balance:{" "}
            {formatMoney(balance)}
          </div>
        )}
      </div>

      {/* Success banner */}
      {successMessage && (
        <div
          style={{
            marginBottom: "24px",
            padding: "16px 20px",
            borderRadius: "16px",
            background:
              "rgba(34,197,94,0.12)",
            border:
              "1px solid rgba(34,197,94,0.3)",
            color: "#4ADE80",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p
          style={{
            color: "#94A3B8",
            fontSize: "18px",
          }}
        >
          Loading challenges...
        </p>
      )}

      {/* Load error */}
      {!loading && loadError && (
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
          {loadError}
        </div>
      )}

      {/* Empty state */}
      {!loading &&
        !loadError &&
        challenges.length === 0 && (
          <div
            style={{
              ...cardStyle,
              textAlign:
                "center" as const,
              padding: "60px 28px",
            }}
          >
            <h2
              style={{
                marginBottom: "12px",
              }}
            >
              No challenges yet
            </h2>

            <p
              style={{
                color: "#94A3B8",
                lineHeight: 1.7,
              }}
            >
              Once an admin creates a
              challenge, it will show
              up here and you can
              commit to it.
            </p>
          </div>
        )}

      {/* Challenge cards */}
      {!loading && !loadError && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(340px,1fr))",
            gap: "24px",
          }}
        >
          {challenges.map(
            (challenge) => {
              const joined =
                joinedIds.has(
                  challenge.id
                );

              const ended =
                new Date(
                  challenge.endDate
                ).getTime() <=
                Date.now();

              const closed =
                challenge.completed ||
                !challenge.isActive ||
                ended;

              const cantAfford =
                balance !== null &&
                balance <
                  challenge.entryFee;

              const busy =
                joiningId ===
                challenge.id;

              const disabled =
                joined ||
                closed ||
                cantAfford ||
                busy;

              let label = "Join Journey";

              if (busy)
                label = "Joining...";
              else if (joined)
                label = "Already Joined";
              else if (
                challenge.completed
              )
                label = "Completed";
              else if (closed)
                label = "Closed";
              else if (cantAfford)
                label =
                  "Insufficient Balance";

              return (
                <motion.div
                  key={challenge.id}
                  whileHover={
                    disabled
                      ? undefined
                      : {
                          y: -8,
                          scale: 1.02,
                        }
                  }
                  style={cardStyle}
                >
                  <div
                    style={{
                      display:
                        "inline-block",
                      alignSelf:
                        "flex-start",
                      padding:
                        "8px 14px",
                      borderRadius:
                        "999px",
                      background: closed
                        ? "rgba(148,163,184,0.15)"
                        : "rgba(34,197,94,0.15)",
                      color: closed
                        ? "#94A3B8"
                        : "#4ADE80",
                      fontWeight: 700,
                      fontSize: "14px",
                      marginBottom:
                        "18px",
                    }}
                  >
                    {challenge.completed
                      ? "Completed"
                      : ended
                      ? "Ended"
                      : !challenge.isActive
                      ? "Closed"
                      : "Open"}
                  </div>

                  <h2
                    style={{
                      marginBottom:
                        "14px",
                      fontSize: "26px",
                    }}
                  >
                    {challenge.title}
                  </h2>

                  <p
                    style={{
                      color: "#94A3B8",
                      lineHeight: 1.7,
                      marginBottom:
                        "24px",
                    }}
                  >
                    {challenge.description ||
                      "No description provided."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "10px",
                      marginBottom:
                        "24px",
                      color: "#CBD5E1",
                    }}
                  >
                    <div>
                      Stake:{" "}
                      <strong>
                        {formatMoney(
                          challenge.entryFee
                        )}
                      </strong>
                    </div>

                    <div>
                      Duration:{" "}
                      {durationInDays(
                        challenge
                      )}{" "}
                      days
                    </div>

                    <div>
                      Participants:{" "}
                      {challenge._count
                        ?.participants ??
                        0}
                    </div>

                    <div
                      style={{
                        color:
                          "#94A3B8",
                        fontSize:
                          "14px",
                      }}
                    >
                      Up to{" "}
                      {
                        challenge.maxMisses
                      }{" "}
                      missed days ·{" "}
                      {
                        challenge.penaltyPercentage
                      }
                      % penalty per miss
                    </div>
                  </div>

                  {joinErrors[
                    challenge.id
                  ] && (
                    <p
                      style={{
                        color: "#FCA5A5",
                        marginBottom:
                          "14px",
                        fontSize: "14px",
                      }}
                    >
                      {
                        joinErrors[
                          challenge.id
                        ]
                      }
                    </p>
                  )}

                  <button
                    onClick={() =>
                      handleJoin(
                        challenge
                      )
                    }
                    disabled={disabled}
                    style={{
                      marginTop: "auto",
                      width: "100%",
                      background: disabled
                        ? "#1E293B"
                        : "linear-gradient(135deg,#22C55E,#4ADE80)",
                      border: "none",
                      color: disabled
                        ? "#64748B"
                        : "#081018",
                      padding: "14px",
                      borderRadius:
                        "14px",
                      fontWeight: 700,
                      fontSize: "15px",
                      cursor: disabled
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    {label}
                  </button>
                </motion.div>
              );
            }
          )}
        </div>
      )}
    </Layout>
  );
}
