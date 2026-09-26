import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Layout from "../components/Layout";
import CoachPanel from "../components/CoachPanel";
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
  font,
  weight,
  radius,
  heat,
} from "../theme";

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

const WEEKS = 18;
const DAY_MS = 86400000;

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(
    d.getMonth() + 1
  ).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** The most recent WEEKS weeks, oldest first, ending this week. */
function buildCalendar(
  activity: ActivityDay[]
) {
  const counts = new Map(
    activity.map((a) => [
      a.date,
      a.count,
    ])
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(
    end.getDate() + (6 - end.getDay())
  );

  const days: {
    key: string;
    count: number;
    future: boolean;
  }[] = [];

  for (
    let i = WEEKS * 7 - 1;
    i >= 0;
    i--
  ) {
    const d = new Date(
      end.getTime() - i * DAY_MS
    );

    const key = toKey(d);

    days.push({
      key,
      count: counts.get(key) ?? 0,
      future:
        d.getTime() > today.getTime(),
    });
  }

  return days;
}

/** Four steps of one hue. Intensity means verified days, nothing else. */
function cellColour(
  count: number,
  future: boolean
) {
  if (future) return "transparent";
  return heat[Math.min(count, heat.length - 1)];
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
        <Muted>
          Loading your dashboard...
        </Muted>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <Notice tone="danger">
          {error ||
            "No data available."}
        </Notice>
      </Layout>
    );
  }

  const { stats, activity } = data;

  const calendar =
    buildCalendar(activity);

  const hasHistory =
    stats.totalSubmissions > 0;

  return (
    <Layout>
      <PageHeader
        title="Overview"
        description="Your commitments, and the record of keeping them."
      />

      <CoachPanel />

      <TileGrid>
        <StatTile
          value={String(
            stats.currentStreak
          )}
          label="Current streak"
          hint={
            stats.currentStreak === 1
              ? "day"
              : "days"
          }
          tone={
            stats.currentStreak > 0
              ? "accent"
              : undefined
          }
        />

        <StatTile
          value={String(
            stats.activeChallenges
          )}
          label="Active challenges"
        />

        <StatTile
          value={
            stats.consistency === null
              ? "—"
              : stats.consistency + "%"
          }
          label="Consistency"
          hint={
            stats.consistency === null
              ? "no days expected yet"
              : `${stats.approvedDays} of ${stats.expectedDays} days`
          }
        />

        <StatTile
          value={String(
            stats.completedChallenges
          )}
          label="Completed"
        />
      </TileGrid>

      {/* Activity ------------------------------------------------ */}
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
              fontWeight: weight.semibold,
              margin: 0,
            }}
          >
            Activity
          </h2>

          <span
            style={{
              fontSize: font.tiny,
              color: colour.textFaint,
            }}
          >
            Each square is a day with
            approved proof
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateRows:
              "repeat(7, 12px)",
            gridAutoFlow: "column",
            gridAutoColumns: "12px",
            gap: "3px",
            overflowX: "auto",
            paddingBottom: space.xs,
          }}
        >
          {calendar.map((day) => (
            <div
              key={day.key}
              title={
                day.future
                  ? ""
                  : `${day.key}: ${day.count} approved`
              }
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "3px",
                background: cellColour(
                  day.count,
                  day.future
                ),
              }}
            />
          ))}
        </div>

        {!hasHistory && (
          <p
            style={{
              color: colour.textMuted,
              fontSize: font.small,
              marginTop: space.lg,
              marginBottom: 0,
            }}
          >
            Nothing here yet.{" "}
            <Link to="/challenges">
              Join a challenge
            </Link>{" "}
            and your first square appears
            when your proof is approved.
          </p>
        )}
      </Card>

      {/* Secondary ----------------------------------------------- */}
      <TileGrid min="170px">
        <StatTile
          value={String(
            stats.longestStreak
          )}
          label="Longest streak"
        />

        <StatTile
          value={String(
            stats.approvedDays
          )}
          label="Approved days"
        />

        <StatTile
          value={String(
            stats.pendingSubmissions
          )}
          label="Awaiting review"
          tone={
            stats.pendingSubmissions > 0
              ? "warn"
              : undefined
          }
        />

        <StatTile
          value={String(
            stats.eliminatedChallenges
          )}
          label="Eliminated from"
          tone={
            stats.eliminatedChallenges >
            0
              ? "danger"
              : undefined
          }
        />
      </TileGrid>

      <p
        style={{
          color: colour.textFaint,
          fontSize: font.tiny,
          marginTop: space.xl,
          paddingTop: space.lg,
          borderTop: `1px solid ${colour.border}`,
          borderRadius: radius.sm,
        }}
      >
        Every figure above is calculated
        from your own submissions.
      </p>
    </Layout>
  );
}
