import { useEffect, useState } from "react";

import api from "../services/api";
import {
  colour,
  space,
  radius,
  font,
  weight,
} from "../theme";

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
 * Renders nothing when the server has no key configured.
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

        if (!status.data.configured) {
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
        background: colour.surface,
        border: `1px solid ${colour.border}`,
        borderLeft: `2px solid ${colour.accent}`,
        borderRadius: radius.lg,
        padding: space.xl,
        marginBottom: space.lg,
      }}
    >
      <p
        style={{
          fontSize: font.tiny,
          fontWeight: weight.medium,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: colour.textFaint,
          margin: `0 0 ${space.sm}`,
        }}
      >
        Coach
      </p>

      {loading ? (
        <p
          style={{
            color: colour.textMuted,
            fontSize: font.body,
            margin: 0,
          }}
        >
          Reading your week...
        </p>
      ) : (
        <>
          <p
            style={{
              color: colour.text,
              fontSize: font.body,
              lineHeight: 1.65,
              margin: 0,
              maxWidth: "70ch",
            }}
          >
            {state?.message}
          </p>

          {state?.status === "ok" && (
            <p
              style={{
                color: colour.textFaint,
                fontSize: font.tiny,
                margin: `${space.md} 0 0`,
              }}
            >
              Written by AI from your own
              figures. The numbers are
              calculated by uCommit, not
              the model.
            </p>
          )}
        </>
      )}
    </div>
  );
}
