import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { signIn } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Image source={require("../assets/jic-logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.tagline}>AI-Powered. People-Focused.</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>JIC Messages</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>
        <Text style={styles.cardSub}>Access your JIC Agents messages</Text>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>✉</Text>
          <TextInput style={styles.input} placeholder="email@yourpractice.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#999" />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholderTextColor="#999" />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eye}>{showPassword ? "👁" : "👁‍🗨"}</Text>
          </TouchableOpacity>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
          {loading ? <ActivityIndicator color="#0c2340" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.forgot}>
          <Text style={styles.forgotText}>Forgot your password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c2340", alignItems: "center", paddingTop: 60 },
  logo: { width: 180, height: 100, marginBottom: 8 },
  tagline: { color: "#14b8a6", fontSize: 12, letterSpacing: 1, marginBottom: 16 },
  badge: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#14b8a6", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24 },
  badgeText: { color: "#14b8a6", fontSize: 14, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "90%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#0c2340", marginBottom: 4 },
  cardSub: { color: "#5c6b7a", fontSize: 14, marginBottom: 16 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: "#0c2340" },
  eye: { fontSize: 16 },
  button: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#0c2340", fontSize: 16, fontWeight: "700" },
  error: { color: "#e11d48", textAlign: "center", marginBottom: 8 },
  forgot: { marginTop: 12, alignItems: "center" },
  forgotText: { color: "#14b8a6", fontSize: 14 },
});
