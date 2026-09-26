/**
 * Design tokens.
 *
 * Every colour, size and space in the app comes from here. Before this
 * existed the same values were retyped inline across eight pages - 218
 * colour literals, six different card radii and seven heading sizes -
 * so nothing quite matched anything else.
 *
 * The direction is restrained: one accent, used sparingly, on a quiet
 * dark ground. Emphasis comes from spacing and weight, not from size
 * and colour.
 */

export const colour = {
  // Ground
  bg: "#0A0E16",
  surface: "#111722",
  surfaceRaised: "#161D2A",
  surfaceInput: "#0C1119",

  // Lines
  border: "#1F2836",
  borderStrong: "#2A3545",

  // Text
  text: "#E8ECF4",
  textMuted: "#8A93A6",
  textFaint: "#5A6376",

  // The one accent. Used for the primary action and verified state.
  accent: "#22C55E",
  accentHover: "#16A34A",
  accentSoft: "rgba(34,197,94,0.12)",
  accentBorder: "rgba(34,197,94,0.25)",
  accentText: "#4ADE80",

  // Status. Muted on purpose - these report, they do not shout.
  warn: "#D9A441",
  warnSoft: "rgba(217,164,65,0.12)",
  danger: "#E06A6A",
  dangerSoft: "rgba(224,106,106,0.12)",
  info: "#6B9BD8",
  infoSoft: "rgba(107,155,216,0.12)",

  onAccent: "#07130B",
} as const;

/** 4px rhythm. Nothing between these steps. */
export const space = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
} as const;

/** Three radii, not six. */
export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  pill: "999px",
} as const;

/**
 * A real scale. The old headings ran 44, 48, 52, 56, 58, 62 and 72px -
 * effectively arbitrary. Product interfaces read better small.
 */
export const font = {
  display: "32px",
  title: "22px",
  heading: "17px",
  body: "15px",
  small: "13px",
  tiny: "12px",
  metric: "28px",
} as const;

export const weight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/** Activity heatmap scale. One hue, four steps of verified work. */
export const heat = [
  "#151C27",
  "#1B5E37",
  "#22C55E",
  "#5EE9A0",
] as const;

export const shadow = {
  card: "0 1px 2px rgba(0,0,0,0.3)",
  raised: "0 4px 16px rgba(0,0,0,0.35)",
} as const;

/** The standard surface. One definition, used everywhere. */
export const card: React.CSSProperties = {
  background: colour.surface,
  border: `1px solid ${colour.border}`,
  borderRadius: radius.lg,
  padding: space.xl,
};

export const pageTitle: React.CSSProperties = {
  fontSize: font.display,
  fontWeight: weight.semibold,
  letterSpacing: "-0.02em",
  margin: 0,
  color: colour.text,
};

export const sectionTitle: React.CSSProperties = {
  fontSize: font.title,
  fontWeight: weight.semibold,
  letterSpacing: "-0.01em",
  margin: 0,
  color: colour.text,
};

export const label: React.CSSProperties = {
  fontSize: font.small,
  color: colour.textMuted,
  margin: 0,
};

export const money = (value: number) =>
  "₹" +
  value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
