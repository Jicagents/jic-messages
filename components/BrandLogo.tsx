import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

// The one JIC Agents logo treatment used on every screen: the transparent jic-logo-mark.png
// on a rounded white pill. `size` is the logo height; the pill padding scales with it.
const MARK = require("../assets/jic-logo-mark.png");
const RATIO = 502 / 265; // jic-logo-mark.png width / height

export function BrandLogo({ size = 34, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const padV = Math.round(size * 0.18);
  const padH = Math.round(size * 0.42);
  return (
    <View
      style={[styles.pill, { paddingVertical: padV, paddingHorizontal: padH, borderRadius: size }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="JIC Agents"
    >
      <Image source={MARK} style={{ height: size, width: Math.round(size * RATIO) }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: "#FFFFFF", alignSelf: "flex-start", alignItems: "center", justifyContent: "center" },
});
