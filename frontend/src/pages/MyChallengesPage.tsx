import Layout from "../components/Layout";
import { motion } from "framer-motion";

export default function MyChallengesPage() {
  const myChallenges = [
    {
      title: "30 Day Walking Challenge",
      progress: 80,
      streak: 24,
      completedDays: 24,
      totalDays: 30,
    },
    {
      title: "Daily Coding Challenge",
      progress: 45,
      streak: 9,
      completedDays: 9,
      totalDays: 21,
    },
  ];

  const cardStyle = {
    background: "#111827",
    border: "1px solid #1E293B",
    borderRadius: "22px",
    padding: "24px",
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.25)",
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

      {/* Personal Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "20px",
          marginBottom: "40px",
        }}
      >
        <div style={cardStyle}>
          <p
            style={{
              color: "#94A3B8",
            }}
          >
            🔥 Current Streak
          </p>

          <h2
            style={{
              marginTop: "10px",
              fontSize: "34px",
            }}
          >
            24 Days
          </h2>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              color: "#94A3B8",
            }}
          >
            📈 Consistency Score
          </p>

          <h2
            style={{
              marginTop: "10px",
              fontSize: "34px",
            }}
          >
            84%
          </h2>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              color: "#94A3B8",
            }}
          >
            ⭐ Challenges Completed
          </p>

          <h2
            style={{
              marginTop: "10px",
              fontSize: "34px",
            }}
          >
            12
          </h2>
        </div>

        <div style={cardStyle}>
          <p
            style={{
              color: "#94A3B8",
            }}
          >
            🏆 Longest Streak
          </p>

          <h2
            style={{
              marginTop: "10px",
              fontSize: "34px",
            }}
          >
            42 Days
          </h2>
        </div>
      </div>

      {/* Active Journeys */}
      <h2
        style={{
          marginBottom: "24px",
          fontSize: "30px",
        }}
      >
        Active Journeys
      </h2>

      <div
        style={{
          display: "grid",
          gap: "24px",
        }}
      >
        {myChallenges.map(
          (challenge, index) => (
            <motion.div
              key={index}
              whileHover={{
                y: -5,
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
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "20px",
                }}
              >
                <h2>
                  {
                    challenge.title
                  }
                </h2>

                <span
                  style={{
                    color:
                      "#F59E0B",
                    fontWeight:
                      700,
                  }}
                >
                  🔥 {
                    challenge.streak
                  } Day Streak
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
                Day{" "}
                {
                  challenge.completedDays
                }
                {" / "}
                {
                  challenge.totalDays
                }
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
                    width: `${challenge.progress}%`,
                    background:
                      "linear-gradient(90deg,#22C55E,#60A5FA)",
                    height:
                      "100%",
                  }}
                />
              </div>

              <p
                style={{
                  color:
                    "#94A3B8",
                  marginBottom:
                    "18px",
                }}
              >
                {challenge.progress}%
                Complete
              </p>

              <button
                style={{
                  background:
                    "linear-gradient(135deg,#22C55E,#4ADE80)",
                  color:
                    "#081018",
                  border:
                    "none",
                  padding:
                    "14px 22px",
                  borderRadius:
                    "14px",
                  fontWeight:
                    700,
                  cursor:
                    "pointer",
                }}
              >
                Continue Journey
              </button>
            </motion.div>
          )
        )}
      </div>
    </Layout>
  );
}