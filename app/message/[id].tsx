import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";

export default function MessageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // In production, fetch the full message by id
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Message</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Caller</Text>
        <Text style={styles.value}>Loading...</Text>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openURL("tel:")}>
          <Text style={styles.buttonText}>Call Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f8fb" },
  header: { backgroundColor: "#0c2340", color: "#fff", fontSize: 20, fontWeight: "700", padding: 16, paddingTop: 48 },
  card: { backgroundColor: "#fff", margin: 16, padding: 20, borderRadius: 12 },
  label: { color: "#7d8ea5", fontSize: 12, marginBottom: 4 },
  value: { color: "#0c2340", fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#0c2340", fontWeight: "700" },
});
