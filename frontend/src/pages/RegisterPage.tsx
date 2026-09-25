import { useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";

import { registerUser } from "../services/auth";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] =
    useState(false);

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    // Checked here for a fast, friendly message. The server checks
    // all of this again - the UI is never the real gate.
    if (cleanName.length < 2) {
      setError(
        "Please enter your name."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Use at least 8 characters for your password."
      );
      return;
    }

    if (password !== confirm) {
      setError(
        "Those passwords don't match."
      );
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser(
        cleanName,
        cleanEmail,
        password
      );

      localStorage.setItem(
        "token",
        data.token
      );

      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Could not create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "22px",
    borderRadius: "16px",
    border: "none",
    fontSize: "17px",
    marginBottom: "18px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
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
            WebkitTextFillColor:
              "transparent",

            textShadow:
              "0 0 25px rgba(52,211,153,0.35)",
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
          The hardest part is
          starting.
        </h2>

        <p
          style={{
            fontSize: "26px",
            color: "#94A3B8",
            marginBottom: "50px",
          }}
        >
          So start here.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            fontSize: "22px",
          }}
        >
          <span>
            ✓ Pick a challenge that
            matches your goal
          </span>

          <span>
            ✓ Commit a stake you'd
            rather not lose
          </span>

          <span>
            ✓ Show up daily and prove
            it
          </span>
        </div>
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
        <form
          onSubmit={handleRegister}
          style={{
            width: "100%",
            maxWidth: "560px",

            background:
              "rgba(15,23,42,0.85)",

            border:
              "1px solid rgba(255,255,255,0.08)",

            backdropFilter: "blur(20px)",
            borderRadius: "32px",
            padding: "52px",

            boxShadow:
              "0 25px 60px rgba(0,0,0,0.35)",
          }}
        >
          <h2
            style={{
              fontSize: "44px",
              marginBottom: "12px",
            }}
          >
            Create Account
          </h2>

          <p
            style={{
              color: "#94A3B8",
              marginBottom: "36px",
              fontSize: "17px",
            }}
          >
            One promise, kept daily.
          </p>

          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            required
            autoComplete="name"
            style={inputStyle}
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
            autoComplete="email"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Password (at least 8 characters)"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
            autoComplete="new-password"
            style={inputStyle}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) =>
              setConfirm(e.target.value)
            }
            required
            autoComplete="new-password"
            style={inputStyle}
          />

          {error && (
            <div
              style={{
                background: "#3B1520",
                color: "#FCA5A5",
                padding: "14px",
                borderRadius: "12px",
                marginBottom: "18px",
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

              background: loading
                ? "#1E293B"
                : "linear-gradient(135deg,#22C55E,#4ADE80)",

              color: loading
                ? "#64748B"
                : "#081018",

              fontWeight: 800,
              fontSize: "18px",

              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Account →"}
          </button>

          <p
            style={{
              marginTop: "24px",
              textAlign: "center",
              color: "#94A3B8",
            }}
          >
            Already committed?{" "}
            <Link
              to="/"
              style={{
                color: "#4ADE80",
                fontWeight: 700,
              }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
