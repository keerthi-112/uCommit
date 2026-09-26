import { useState } from "react";
import {
  useNavigate,
  Link,
} from "react-router-dom";

import AuthShell from "../components/AuthShell";
import {
  Button,
  Input,
} from "../components/ui";
import { registerUser } from "../services/auth";

import {
  colour,
  space,
  font,
  weight,
} from "../theme";

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

    // Checked here for a fast message. The server checks it all again.
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

  return (
    <AuthShell
      heading="The hardest part is starting."
      points={[
        "Pick a challenge that matches a goal you already have.",
        "Commit a stake you would rather not lose.",
        "Show up daily and prove it.",
      ]}
    >
      <form onSubmit={handleRegister}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: weight.semibold,
            letterSpacing: "-0.02em",
            margin: `0 0 ${space.xs}`,
          }}
        >
          Create account
        </h2>

        <p
          style={{
            color: colour.textMuted,
            fontSize: font.small,
            margin: `0 0 ${space.xl}`,
          }}
        >
          One promise, kept daily.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.md,
          }}
        >
          <Input
            placeholder="Your name"
            value={name}
            onChange={setName}
            required
            autoComplete="name"
          />

          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
          />

          <Input
            type="password"
            placeholder="Password (at least 8 characters)"
            value={password}
            onChange={setPassword}
            required
            autoComplete="new-password"
          />

          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={setConfirm}
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p
            style={{
              color: colour.danger,
              fontSize: font.small,
              margin: `${space.md} 0 0`,
            }}
          >
            {error}
          </p>
        )}

        <div
          style={{ marginTop: space.lg }}
        >
          <Button
            type="submit"
            fullWidth
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </Button>
        </div>

        <p
          style={{
            marginTop: space.lg,
            textAlign: "center",
            color: colour.textMuted,
            fontSize: font.small,
          }}
        >
          Already committed?{" "}
          <Link to="/">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
