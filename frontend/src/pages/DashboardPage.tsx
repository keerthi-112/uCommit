import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import Layout from "../components/Layout";
import CoachPanel from "../components/CoachPanel";
import api from "../services/api";

interface Stats {
  currentStreak: number;
  longestStreak: number;
  approvedDays: number;
  expectedDays: number;
  consistency: number | null;
  activeChallenges: number;
  completedChallenges: number;
  eliminatedChallenges: number;
  totalSubmissions: number;
  pendingSubmissions: number;
}

interface ActivityDay {
  date: string;
  count: number;
}

interface DashboardData {
  stats: Stats;
  activity: ActivityDay[];
  challenges: any[];
}

const cardStyle = {
  background: "rgba(8,15,35,0.72)",
  border:
    "1px solid rgba(255,255,255,0.06)",
  borderRadius: "24px",
  backdropFilter: "blur(20px)",
  padding: "28px",
  boxShadow:
    "0 20px 40px rgba(0,0,0,0.25)",
};

const WEEKS = 15;
const DAY_MS = 86400000;

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * The most recent WEEKS weeks, oldest first, ending today.
 * Each cell carries the real approved-submission count for that day.
 */
function buildCalendar(
  activity: ActivityDay[]
) {
  const counts = new Map(
    activity.map((a) => [a.date, a.count])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk back to the most recent Sunday so columns line up as weeks.
  const end = new Date(today);
  end.setDate(
    end.getDate() + (6 - end.getDay())
  );

  const days: {
    key: string;
    count: number;
    future: boolean;
  }[] = [];

  const total = WEEKS * 7;

  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(
      end.getTime() - i * DAY_MS
    );

    const key = toKey(d);

    days.push({
      key,
      count: counts.get(key) ?? 0,
      future: d.getTime() > today.getTime(),
    });
  }

  return days;
}

/** Shades of the accent, by how much was verified that day. */
function cellColour(
  count: number,
  future: boolean
) {
  if (future) return "transparent";
  if (count === 0) return "#0F172A";
  if (count === 1) return "#166534";
  if (count === 2) return "#22C55E";
  return "#72F1B8";
}

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(
          "/dashboard"
        );

        setData(res.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Could not load your dashboard. Is the server running?"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <Layout>
        <p
          style={{
            color: "#94A3B8",
            fontSize: "18px",
          }}
        >
          Loading your dashboard...
        </p>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
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
          {error || "No data available."}
        </div>
      </Layout>
    );
  }

  const { stats, activity } = data;

  const calendar = buildCalendar(
    activity
  );

  const hasHistory =
    stats.totalSubmissions > 0;

  return (
    <Layout>
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ marginBottom: "48px" }}
      >
        <h1
          style={{
            fontSize: "72px",
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
            maxWidth: "900px",
            marginBottom: "20px",
          }}
        >
          Build the future version of
          yourself.
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "20px",
            lineHeight: 1.8,
            maxWidth: "760px",
          }}
        >
          Consistency is not measured in
          motivation.
          <br />
          <br />
          It is measured in the promises
          you keep when nobody is
          watching.
        </p>
      </motion.div>

      <CoachPanel />

      {/* CONSISTENCY CALENDAR */}
      <motion.div
        whileHover={{ y: -2 }}
        style={{
          ...cardStyle,
          marginBottom: "32px",
        }}
      >
        <h3
          style={{
            fontSize: "24px",
            marginBottom: "8px",
          }}
        >
          Consistency Calendar
        </h3>

        <p
          style={{
            color: "#64748B",
            marginBottom: "28px",
          }}
        >
          Every filled square is a day
          with proof that was approved.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateRows:
              "repeat(7, 18px)",
            gridAutoFlow: "column",
            gridAutoColumns: "18px",
            gap: "5px",
            overflowX: "auto",
            paddingBottom: "6px",
          }}
        >
          {calendar.map((day) => (
            <div
              key={day.key}
              title={
                day.future
                  ? ""
                  : `${day.key}: ${
                      day.count
                    } approved`
              }
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "5px",
                background: cellColour(
                  day.count,
                  day.future
                ),
                border: day.future
                  ? "none"
                  : "1px solid rgba(255,255,255,0.04)",
              }}
            />
          ))}
        </div>

        {!hasHistory && (
          <p
            style={{
              color: "#64748B",
              marginTop: "22px",
              lineHeight: 1.7,
            }}
          >
            Nothing here yet.{" "}
            <Link
              to="/challenges"
              style={{
                color: "#4ADE80",
                fontWeight: 600,
              }}
            >
              Join a challenge
            </Link>{" "}
            and your first square appears
            the day your proof is
            approved.
          </p>
        )}
      </motion.div>

      {/* PERSONAL METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {[
          {
            value: String(
              stats.currentStreak
            ),
            label: "Current Streak",
            hint:
              stats.currentStreak === 1
                ? "day"
                : "days",
          },
          {
            value: String(
              stats.activeChallenges
            ),
            label: "Active Challenges",
            hint: "",
          },
          {
            value:
              stats.consistency === null
                ? "—"
                : stats.consistency + "%",
            label: "Consistency",
            hint:
              stats.consistency === null
                ? "no days expected yet"
                : `${stats.approvedDays} of ${stats.expectedDays} days`,
          },
          {
            value: String(
              stats.completedChallenges
            ),
            label:
              "Completed Challenges",
            hint: "",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={cardStyle}
          >
            <h2
              style={{
                fontSize: "44px",
                marginBottom: "6px",
              }}
            >
              {item.value}
            </h2>

            <p
              style={{ color: "#64748B" }}
            >
              {item.label}
            </p>

            {item.hint && (
              <p
                style={{
                  color: "#475569",
                  fontSize: "13px",
                  marginTop: "6px",
                }}
              >
                {item.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* SECONDARY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(220px,1fr))",
          gap: "20px",
        }}
      >
        {[
          {
            value: String(
              stats.longestStreak
            ),
            label: "Longest Streak",
          },
          {
            value: String(
              stats.approvedDays
            ),
            label: "Approved Days",
          },
          {
            value: String(
              stats.pendingSubmissions
            ),
            label: "Awaiting Review",
          },
          {
            value: String(
              stats.eliminatedChallenges
            ),
            label: "Eliminated From",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              ...cardStyle,
              padding: "22px",
            }}
          >
            <h3
              style={{
                fontSize: "28px",
                marginBottom: "4px",
              }}
            >
              {item.value}
            </h3>

            <p
              style={{
                color: "#64748B",
                fontSize: "14px",
              }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
