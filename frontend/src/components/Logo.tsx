import {
  colour,
  space,
  weight,
} from "../theme";

/**
 * The uCommit mark: a checkmark in a rounded square.
 *
 * A commitment kept. The rounded square deliberately echoes a cell of
 * the consistency calendar, which is the app's signature element - so
 * the logo is made of the same shape as the thing it stands for.
 *
 * Drawn as a filled shape rather than an outline because it has to hold
 * up at 20px in the navbar, where thin strokes turn to mush.
 */
export function LogoMark({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill={colour.accent}
      />
      <path
        d="M7.5 12.4l3 3 6-6.4"
        stroke={colour.onAccent}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mark alongside the wordmark. */
export default function Logo({
  size = 20,
  markSize = 20,
}: {
  /** Wordmark font size in px. */
  size?: number;
  markSize?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space.sm,
      }}
    >
      <LogoMark size={markSize} />

      <span
        style={{
          fontSize: size + "px",
          fontWeight: weight.semibold,
          letterSpacing: "-0.02em",
          color: colour.text,
          lineHeight: 1,
        }}
      >
        uCommit
      </span>
    </span>
  );
}
