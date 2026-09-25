import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(
        email.trim(),
        password.trim()
      );

      localStorage.setItem(
        "token",
        data.token
      );

      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns:
          "1.2fr 1fr",
        background:
          "radial-gradient(circle at top left,#0F3D2E22,#020617 45%)",
        color: "#F8FAFC",
        overflow: "hidden",
      }}
    >
      {/* LEFT */}
      <div
        style={{
          padding: "160px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <h1
          style={{
    fontSize: "72px",
    fontWeight: 900,
    letterSpacing: "-2px",

    background:
"linear-gradient(135deg,#A7F3D0 0%,#6EE7B7 20%,#34D399 45%,#22C55E 70%,#00FF88 100%)",

    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",

    textShadow:
"0 0 25px rgba(52,211,153,0.35)"
  }}
        >
          uCommit
        </h1>

        <p
          style={{
            fontSize: "25px",
            color: "#CBD5E1",
            marginBottom: "60px",
          }}
        >
          Own your tomorrow.
        </p>

        <h2
          style={{
            fontSize: "62px",
            fontWeight: 750,
            lineHeight: 1.05,
            maxWidth: "650px",
            marginBottom: "24px",
          }}
        >
          A goal without public
          tracking is just a wish.
        </h2>

        <p
          style={{
            fontSize: "26px",
            color: "#94A3B8",
            marginBottom: "50px",
          }}
        >
          Make it real with us
          today.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            fontSize: "22px",
            marginBottom: "60px",
          }}
        >
          <span>
            ✓ Build consistency
          </span>

          <span>
            ✓ Stay accountable
          </span>

          <span>
            ✓ Become the person
            you promised yourself
            you would be
          </span>
        </div>

        <p
          style={{
            color: "#64748B",
            fontSize: "18px",
          }}
        >
          Trusted by thousands
          building better habits
          one day at a time.
        </p>
      </div>

      {/* RIGHT */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* LOGIN CARD */}
          <form
            onSubmit={handleLogin}
            style={{
              background:
                "rgba(15,23,42,0.85)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              backdropFilter:
                "blur(20px)",
              borderRadius: "32px",
              padding: "52px",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.35)",
            }}
          >
            <h2
              style={{
                fontSize: "48px",
                marginBottom: "12px",
              }}
            >
              Welcome Back
            </h2>

            <p
              style={{
                color: "#94A3B8",
                marginBottom: "36px",
                fontSize: "17px",
              }}
            >
              Don't just say it.
              uCommit.
            </p>

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
              style={{
                width: "100%",
                padding: "25px",
                borderRadius: "16px",
                border: "none",
                fontSize: "17px",
                marginBottom: "20px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
              style={{
                width: "100%",
                padding: "25px",
                borderRadius: "16px",
                border: "none",
                fontSize: "17px",
                marginBottom: "20px",
              }}
            />

            {error && (
              <div
                style={{
                  background:
                    "#3B1520",
                  color: "#FCA5A5",
                  padding: "14px",
                  borderRadius: "12px",
                  marginBottom:
                    "18px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "18px",
                borderRadius: "16px",
                border: "none",
                background:
                  "linear-gradient(135deg,#22C55E,#4ADE80)",
                color: "#081018",
                fontWeight: 800,
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              {loading
                ? "Signing In..."
                : "Continue →"}
            </button>

            <p
              style={{
                marginTop: "24px",
                textAlign: "center",
                color: "#94A3B8",
              }}
            >
              New here?{" "}
              <Link
                to="/register"
                style={{
                  color: "#22C55E",
                  textDecoration:
                    "none",
                  fontWeight: 700,
                }}
              >
                Create account
              </Link>
            </p>
          </form>

          {/* COMMUNITY CARD */}
          <div
            style={{
              background:
                "rgba(15,23,42,0.75)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: "28px",
              padding: "30px",
            }}
          >
            <h3
              style={{
                marginBottom: "22px",
                fontSize: "22px",
              }}
            >
              How it works
            </h3>

            {/* Deliberately not statistics: community numbers cannot be
                read before signing in, and inventing them would be a lie
                on the first screen anyone sees. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {[
                {
                  step: "1",
                  text: "Pick a challenge and commit a stake from your wallet.",
                },
                {
                  step: "2",
                  text: "Submit proof every day that you did the thing.",
                },
                {
                  step: "3",
                  text: "Miss a day and part of your stake goes to everyone who didn't.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    display: "flex",
                    gap: "14px",
                    alignItems:
                      "flex-start",
                  }}
                >
                  <span
                    style={{
                      minWidth: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background:
                        "rgba(34,197,94,0.15)",
                      color: "#4ADE80",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      fontWeight: 700,
                      fontSize: "14px",
                    }}
                  >
                    {item.step}
                  </span>

                  <p
                    style={{
                      color: "#94A3B8",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}