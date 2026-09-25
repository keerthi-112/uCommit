import { useEffect, useState } from "react";

import api from "../services/api";

interface CoachResponse {
  status:
    | "ok"
    | "not_configured"
    | "unavailable";
  message: string;
  model?: string;
}

/**
 * The AI coach's reflection on the signed in user's own numbers.
 *
 * Renders nothing at all when the server has no API key configured, so
 * an unconfigured install shows no broken or empty panel. Any failure
 * is contained here - the rest of the dashboard is unaffected.
 */
export default function CoachPanel() {
  const [state, setState] =
    useState<CoachResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const status = await api.get(
          "/ai/status"
        );

        if (
          !status.data.configured
        ) {
          if (!cancelled) {
            setState(null);
            setLoading(false);
          }
          return;
        }

        const res = await api.get(
          "/ai/coach"
        );

        if (!cancelled)
          setState(res.data);
      } catch {
        // Silent: the coach is an enhancement, not a requirement.
        if (!cancelled) setState(null);
      } finally {
        if (!cancelled)
          setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing configured, or it failed - show nothing rather than a stub.
  if (
    !loading &&
    (!state ||
      state.status === "not_configured")
  ) {
    return null;
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(34,197,94,0.07), rgba(96,165,250,0.05))",
        border:
          "1px solid rgba(114,241,184,0.18)",
        borderRadius: "24px",
        padding: "28px",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#4ADE80",
            display: "inline-block",
          }}
        />

        <h3
          style={{
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#72F1B8",
            margin: 0,
          }}
        >
          Your Coach
        </h3>
      </div>

      {loading ? (
        <p
          style={{
            color: "#64748B",
            fontSize: "17px",
            margin: 0,
          }}
        >
          Reading your week...
        </p>
      ) : (
        <>
          <p
            style={{
              color: "#E2E8F0",
              fontSize: "19px",
              lineHeight: 1.75,
              margin: 0,
              maxWidth: "820px",
            }}
          >
            {state?.message}
          </p>

          {state?.status === "ok" && (
            <p
              style={{
                color: "#475569",
                fontSize: "12px",
                marginTop: "16px",
                marginBottom: 0,
              }}
            >
              Written by AI from your own
              figures. The numbers
              themselves are calculated by
              uCommit, not the model.
            </p>
          )}
        </>
      )}
    </div>
  );
}
