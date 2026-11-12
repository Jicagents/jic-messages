import type { ReactElement, ReactNode } from "react";
import { ScrollView, StyleSheet, View, type RefreshControlProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "./ui";
import { BOTTOM_GAP, colors, space } from "../lib/theme";

/** Navy page with the shared header, full vertical scroll, and room under the last item. */
export function Screen({ title, back, children, refreshControl, tabbed }: { title?: string; back?: boolean; children: ReactNode; refreshControl?: ReactElement<RefreshControlProps>; tabbed?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScreenHeader title={title} back={back} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: (tabbed ? 40 : insets.bottom + BOTTOM_GAP) }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, gap: space.lg },
});
