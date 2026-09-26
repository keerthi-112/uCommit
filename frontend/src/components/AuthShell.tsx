import type { ReactNode } from "react";

import Logo from "./Logo";

import {
  colour,
  space,
  radius,
  font,
  weight,
} from "../theme";

/**
 * Shared frame for sign in and sign up.
 *
 * Both pages previously repeated a fixed two column grid with 64px of
 * padding, which left them unusable below about 1100px. The pitch
 * column now collapses on narrow screens (see index.css) and only the
 * form remains.
 */
export default function AuthShell({
  heading,
  points,
  children,
}: {
  heading: string;
  points: string[];
  children: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-pitch">
        <div
          style={{
            marginBottom: space["3xl"],
          }}
        >
          <Logo size={22} markSize={22} />
        </div>

        <h1
          style={{
            fontSize: "36px",
            fontWeight: weight.semibold,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            maxWidth: "16ch",
            margin: `0 0 ${space.xl}`,
          }}
        >
          {heading}
        </h1>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: space.md,
          }}
        >
          {points.map((point) => (
            <li
              key={point}
              style={{
                display: "flex",
                gap: space.md,
                alignItems: "flex-start",
                color: colour.textMuted,
                fontSize: font.body,
                lineHeight: 1.6,
                maxWidth: "44ch",
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius:
                    radius.pill,
                  background:
                    colour.accent,
                  marginTop: "9px",
                  flexShrink: 0,
                }}
              />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-form-side">
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
