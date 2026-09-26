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
import { loginUser } from "../services/auth";

import {
  colour,
  space,
  font,
  weight,
} from "../theme";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] = useState("");

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
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      heading="A goal without proof is just a wish."
      points={[
        "Commit a stake to a goal that matters to you.",
        "Submit proof every day that you did it.",
        "Miss a day and part of your stake goes to the people who didn't.",
      ]}
    >
      <form onSubmit={handleLogin}>
        <h2
          style={{
            fontSize: "24px",
            fontWeight: weight.semibold,
            letterSpacing: "-0.02em",
            margin: `0 0 ${space.xs}`,
          }}
        >
          Sign in
        </h2>

        <p
          style={{
            color: colour.textMuted,
            fontSize: font.small,
            margin: `0 0 ${space.xl}`,
          }}
        >
          Welcome back.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: space.md,
          }}
        >
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
            placeholder="Password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
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
              ? "Signing in..."
              : "Sign in"}
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
          New here?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
