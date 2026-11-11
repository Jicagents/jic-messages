// Modern Gradient design tokens. Every screen reads colors, radii, and spacing from here.
import { Platform } from "react-native";

export const colors = {
  bg: "#061D32", // deep navy page
  bgDeep: "#04152A",
  surface: "#0B2A47", // elevated card
  surfaceHigh: "#123659", // inputs, list rows on cards
  border: "#1C4569",
  borderStrong: "#2A5A85",
  teal: "#00C7C7", // primary actions
  aqua: "#46E2DD", // highlights, links
  tealInk: "#03202A", // text on teal buttons
  text: "#F2F7FB",
  textMuted: "#A9BED3",
  textFaint: "#7390AC",
  danger: "#FF6B6B",
  dangerBg: "rgba(255,107,107,0.14)",
  dangerBorder: "rgba(255,107,107,0.45)",
  successBg: "rgba(70,226,221,0.14)",
  successBorder: "rgba(70,226,221,0.45)",
  white: "#FFFFFF",
  overlay: "rgba(2,10,20,0.6)",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Extra room under the last item so Android nav buttons and the tab bar never cover it. */
export const BOTTOM_GAP = 120;

export const type = {
  title: { fontSize: 24, fontWeight: "800" as const, color: colors.text, letterSpacing: 0.2 },
  h2: { fontSize: 18, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 16, lineHeight: 23, color: colors.text },
  label: { fontSize: 12.5, fontWeight: "700" as const, color: colors.aqua, letterSpacing: 0.8, textTransform: "uppercase" as const },
  muted: { fontSize: 13.5, color: colors.textMuted },
};

export const elevation = Platform.select({
  android: { elevation: 6 },
  default: { shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
}) as object;

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  padding: space.lg,
  ...elevation,
};
