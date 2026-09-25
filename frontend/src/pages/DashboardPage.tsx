import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import Layout from "../components/Layout";
import api from "../services/api";

interface DashboardData {
  challenges: any[];
}

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
  const fetchDashboard = async () => {
    try {
      const response = await api.get("/dashboard");

      console.log("DASHBOARD DATA");
      console.log(response.data);

      setData(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboard();
}, []);
  if (loading) {
    return (
      <Layout>
        <h2>Loading...</h2>
      </Layout>
    );
  }

  const cardStyle = {
    background:
      "rgba(8,15,35,0.72)",

    border:
      "1px solid rgba(255,255,255,0.06)",

    borderRadius: "24px",

    backdropFilter:
      "blur(20px)",

    padding: "28px",

    boxShadow:
      "0 20px 40px rgba(0,0,0,0.25)",
  };

  return (
    <Layout>
      {/* HERO */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
        }}
        style={{
          marginBottom: "56px",
        }}
      >
        <h1
          style={{
            fontSize: "76px",
            fontWeight: 800,
            letterSpacing: "-3px",
            lineHeight: 1,
            maxWidth: "900px",
            marginBottom: "20px",
          }}
        >
          Build the future
          version of yourself.
        </h1>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "20px",
            lineHeight: 1.8,
            maxWidth: "760px",
          }}
        >
          Consistency is not measured
          in motivation.

          <br />
          <br />

          It is measured in the promises
          you keep when nobody is
          watching.
        </p>
      </motion.div>

      {/* CONSISTENCY CALENDAR */}
      <motion.div
        whileHover={{
          y: -2,
        }}
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
          Every square represents
          a commitment kept.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(14,26px)",
            gap: "8px",
          }}
        >
          {Array.from({
            length: 70,
          }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "8px",

                background:
                  i % 7 === 0
                    ? "#0F172A"
                    : i % 4 === 0
                    ? "#72F1B8"
                    : i % 3 === 0
                    ? "#34D399"
                    : "#166534",
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* FOCUS + TREND */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "2fr 1fr",
          gap: "24px",
          marginBottom: "32px",
        }}
      >
        {/* TODAY'S FOCUS */}
        <div style={cardStyle}>
          <h3
            style={{
              marginBottom: "24px",
            }}
          >
            Today's Focus
          </h3>

          <div
            style={{
              padding: "28px",
              background:
                "rgba(255,255,255,0.03)",
              borderRadius: "18px",
            }}
          >
            <h2
              style={{
                fontSize: "40px",
                fontWeight: 800,
                marginBottom: "10px",
              }}
            >
              Walk 5,000 Steps
            </h2>

            <span
              style={{
                color: "#72F1B8",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Day 24 of 30
            </span>

            <p
              style={{
                marginTop: "20px",
                color: "#94A3B8",
                lineHeight: 1.8,
                maxWidth: "600px",
              }}
            >
              Consistency compounds.
              Small actions become
              identity.
            </p>
          </div>
        </div>

        {/* TREND */}
        <div style={cardStyle}>
          <h3
            style={{
              marginBottom: "24px",
            }}
          >
            Weekly Trend
          </h3>

          <svg
            width="100%"
            height="150"
            viewBox="0 0 300 150"
          >
            <polyline
              fill="none"
              stroke="#34D399"
              strokeWidth="4"
              points="
              0,120
              40,105
              80,85
              120,92
              160,65
              200,50
              240,35
              300,20
            "
            />
          </svg>

          <p
            style={{
              color: "#64748B",
              marginTop: "12px",
            }}
          >
            Momentum is building
            steadily.
          </p>
        </div>
      </div>

      {/* CHALLENGE HEALTH */}
      <div
        style={{
          ...cardStyle,
          marginBottom: "32px",
        }}
      >
        <h3
          style={{
            marginBottom: "28px",
          }}
        >
          Challenge Health
        </h3>

        {[
          {
            label:
              "Perfect Streak",
            count: 42,
            width: "90%",
          },
          {
            label:
              "Missed Once",
            count: 18,
            width: "55%",
          },
          {
            label:
              "Missed Twice",
            count: 7,
            width: "25%",
          },
          {
            label:
              "Eliminated",
            count: 3,
            width: "10%",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "10px",
              }}
            >
              <span>
                {item.label}
              </span>

              <span>
                {item.count}
              </span>
            </div>

            <div
              style={{
                height: "10px",
                background:
                  "#111827",
                borderRadius:
                  "999px",
              }}
            >
              <div
                style={{
                  width: item.width,
                  height: "100%",
                  borderRadius:
                    "999px",
                  background:
                    "linear-gradient(90deg,#72F1B8,#34D399)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* PERSONAL METRICS */}
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
            value: "18",
            label:
              "Current Streak",
          },
          {
            value: String(
              data?.challenges
                ?.length ?? 0
            ),
            label:
              "Active Goals",
          },
          {
            value: "84%",
            label:
              "Consistency Score",
          },
          {
            value: "12",
            label:
              "Completed Challenges",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={cardStyle}
          >
            <h2
              style={{
                fontSize: "48px",
                marginBottom: "8px",
              }}
            >
              {item.value}
            </h2>

            <p
              style={{
                color: "#64748B",
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
