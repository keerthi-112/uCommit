import Layout from "../components/Layout";
import { motion } from "framer-motion";

export default function LeaderboardPage() {
  const insights = [
    {
      title: "Active Members",
      value: "1,248",
      icon: "👥",
    },
    {
      title: "Challenges In Progress",
      value: "56",
      icon: "🎯",
    },
    {
      title: "Average Consistency",
      value: "84%",
      icon: "📈",
    },
    {
      title: "Longest Active Streak",
      value: "128 Days",
      icon: "🔥",
    },
  ];

  return (
    <Layout>
      {/* Hero */}
      <div
        style={{
          marginBottom: "50px",
        }}
      >
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            marginBottom: "16px",
          }}
        >
          Community Insights
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "20px",
            maxWidth: "850px",
            lineHeight: 1.8,
          }}
        >
          People who chose discipline
          when motivation wasn't enough.

          <br />
          <br />

          Every challenge completed,
          every streak maintained,
          and every commitment honored
          strengthens our community.
        </p>
      </div>

      {/* Community Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        {insights.map(
          (item, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -6,
              }}
              style={{
                background:
                  "#111827",
                border:
                  "1px solid #1E293B",
                borderRadius:
                  "24px",
                padding:
                  "28px",
              }}
            >
              <div
                style={{
                  fontSize: "34px",
                  marginBottom:
                    "16px",
                }}
              >
                {item.icon}
              </div>

              <p
                style={{
                  color:
                    "#94A3B8",
                  marginBottom:
                    "8px",
                }}
              >
                {item.title}
              </p>

              <h2
                style={{
                  fontSize: "34px",
                }}
              >
                {item.value}
              </h2>
            </motion.div>
          )
        )}
      </div>

      {/* Community Progress */}
      <div
        style={{
          background: "#111827",
          border: "1px solid #1E293B",
          borderRadius: "24px",
          padding: "30px",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{
            marginBottom: "30px",
          }}
        >
          Community Progress Snapshot
        </h2>

        {[
          {
            label:
              "Currently On Track",
            value: 125,
            width: "85%",
            color:
              "#22C55E",
          },
          {
            label:
              "Missed Once",
            value: 32,
            width: "35%",
            color:
              "#F59E0B",
          },
          {
            label:
              "Missed Twice",
            value: 11,
            width: "18%",
            color:
              "#FB923C",
          },
          {
            label:
              "Eliminated",
            value: 4,
            width: "8%",
            color:
              "#EF4444",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              marginBottom:
                "22px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                marginBottom:
                  "8px",
              }}
            >
              <span>
                {item.label}
              </span>

              <span>
                {item.value}
              </span>
            </div>

            <div
              style={{
                height: "14px",
                background:
                  "#1E293B",
                borderRadius:
                  "999px",
                overflow:
                  "hidden",
              }}
            >
              <div
                style={{
                  width:
                    item.width,
                  height:
                    "100%",
                  background:
                    item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Community Message */}
      <div
        style={{
          background:
            "linear-gradient(135deg,#22C55E15,#60A5FA15)",
          border:
            "1px solid #1E293B",
          borderRadius:
            "24px",
          padding: "32px",
        }}
      >
        <h2
          style={{
            marginBottom:
              "14px",
          }}
        >
          Don't just say it.
          uCommit.
        </h2>

        <p
          style={{
            color:
              "#94A3B8",
            lineHeight:
              1.8,
          }}
        >
          Accountability grows
          stronger when people
          commit together.

          Every check-in,
          every completed day,
          and every streak
          contributes to a culture
          of consistency.
        </p>
      </div>
    </Layout>
  );
}