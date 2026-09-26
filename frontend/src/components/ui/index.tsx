/**
 * Shared interface primitives.
 *
 * Each of these existed already, retyped inline on every page with
 * slightly different values. One definition each means a card is a card
 * everywhere, and a change lands in one place.
 */

import React from "react";

import {
  colour,
  space,
  radius,
  font,
  weight,
  card as cardStyle,
  label as labelStyle,
} from "../../theme";

// ---------------------------------------------------------------
// Card
// ---------------------------------------------------------------

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padded?: boolean;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        ...(padded
          ? {}
          : { padding: 0 }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------
// Button
// ---------------------------------------------------------------

type ButtonVariant =
  | "primary"
  | "quiet"
  | "secondary"
  | "danger";

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  fullWidth = false,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    padding: `10px ${space.lg}`,
    borderRadius: radius.sm,
    fontSize: font.body,
    fontWeight: weight.medium,
    fontFamily: "inherit",
    cursor: disabled
      ? "not-allowed"
      : "pointer",
    width: fullWidth ? "100%" : "auto",
    transition:
      "background 120ms ease, border-color 120ms ease",
    border: "1px solid transparent",
  };

  const variants: Record<
    ButtonVariant,
    React.CSSProperties
  > = {
    primary: {
      background: disabled
        ? colour.surfaceRaised
        : colour.accent,
      color: disabled
        ? colour.textFaint
        : colour.onAccent,
      fontWeight: weight.semibold,
    },
    // For repeated actions - a grid of cards each with a call to
    // action. A filled accent on every card stops being an accent.
    quiet: {
      background: disabled
        ? "transparent"
        : colour.accentSoft,
      borderColor: disabled
        ? colour.border
        : colour.accentBorder,
      color: disabled
        ? colour.textFaint
        : colour.accentText,
      fontWeight: weight.medium,
    },
    secondary: {
      background: "transparent",
      borderColor: colour.borderStrong,
      color: disabled
        ? colour.textFaint
        : colour.text,
    },
    danger: {
      background: "transparent",
      borderColor: colour.dangerSoft,
      color: colour.danger,
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------
// Input
// ---------------------------------------------------------------

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoComplete,
  min,
  step,
  onKeyDown,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  min?: string;
  step?: string;
  onKeyDown?: (
    e: React.KeyboardEvent
  ) => void;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) =>
        onChange(e.target.value)
      }
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      min={min}
      step={step}
      style={{
        width: "100%",
        padding: `11px ${space.md}`,
        borderRadius: radius.sm,
        background: colour.surfaceInput,
        border: `1px solid ${colour.border}`,
        color: colour.text,
        fontSize: font.body,
        fontFamily: "inherit",
        outline: "none",
        ...style,
      }}
    />
  );
}

// ---------------------------------------------------------------
// Badge
// ---------------------------------------------------------------

export type Tone =
  | "neutral"
  | "accent"
  | "warn"
  | "danger"
  | "info";

const TONES: Record<
  Tone,
  { bg: string; fg: string }
> = {
  neutral: {
    bg: "rgba(138,147,166,0.12)",
    fg: colour.textMuted,
  },
  accent: {
    bg: colour.accentSoft,
    fg: colour.accentText,
  },
  warn: {
    bg: colour.warnSoft,
    fg: colour.warn,
  },
  danger: {
    bg: colour.dangerSoft,
    fg: colour.danger,
  },
  info: {
    bg: colour.infoSoft,
    fg: colour.info,
  },
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const t = TONES[tone];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: radius.pill,
        background: t.bg,
        color: t.fg,
        fontSize: font.tiny,
        fontWeight: weight.medium,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------
// StatTile
// ---------------------------------------------------------------

export function StatTile({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: "accent" | "warn" | "danger";
}) {
  const valueColour =
    tone === "accent"
      ? colour.accentText
      : tone === "warn"
      ? colour.warn
      : tone === "danger"
      ? colour.danger
      : colour.text;

  return (
    <Card>
      <p
        style={{
          ...labelStyle,
          marginBottom: space.sm,
        }}
      >
        {label}
      </p>

      <p
        style={{
          fontSize: font.metric,
          fontWeight: weight.semibold,
          letterSpacing: "-0.02em",
          color: valueColour,
          margin: 0,
        }}
      >
        {value}
      </p>

      {hint && (
        <p
          style={{
            fontSize: font.tiny,
            color: colour.textFaint,
            margin: `${space.xs} 0 0`,
          }}
        >
          {hint}
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------
// PageHeader
// ---------------------------------------------------------------

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: space.lg,
        flexWrap: "wrap",
        marginBottom: space["2xl"],
      }}
    >
      <div>
        <h1
          style={{
            fontSize: font.display,
            fontWeight: weight.semibold,
            letterSpacing: "-0.02em",
            margin: 0,
            color: colour.text,
          }}
        >
          {title}
        </h1>

        {description && (
          <p
            style={{
              color: colour.textMuted,
              fontSize: font.body,
              lineHeight: 1.6,
              margin: `${space.sm} 0 0`,
              maxWidth: "62ch",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

// ---------------------------------------------------------------
// Notices
// ---------------------------------------------------------------

export function Notice({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const t = TONES[tone];

  return (
    <div
      style={{
        padding: `${space.md} ${space.lg}`,
        borderRadius: radius.md,
        background: t.bg,
        border: `1px solid ${
          tone === "accent"
            ? colour.accentBorder
            : "transparent"
        }`,
        color: t.fg,
        fontSize: font.body,
        marginBottom: space.xl,
      }}
    >
      {children}
    </div>
  );
}

/** Consistent loading and empty states, instead of ad hoc paragraphs. */
export function Muted({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p
      style={{
        color: colour.textMuted,
        fontSize: font.body,
      }}
    >
      {children}
    </p>
  );
}

/** Responsive grid used by every tile row. */
export function TileGrid({
  children,
  min = "200px",
}: {
  children: React.ReactNode;
  min?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit,minmax(${min},1fr))`,
        gap: space.lg,
      }}
    >
      {children}
    </div>
  );
}
