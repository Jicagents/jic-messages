import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import { signIn } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSignIn() {
    setError("");
    try {
      await signIn(email, password);
      router.replace("/inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>JIC AGENTS</Text>
      <Text style={styles.title}>JIC Messages</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c2340", justifyContent: "center", padding: 24 },
  brand: { color: "#14b8a6", fontSize: 14, letterSpacing: 2, textAlign: "center", marginBottom: 8 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#14b8a6", borderRadius: 8, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#0c2340", fontSize: 16, fontWeight: "700" },
  error: { color: "#fb7185", textAlign: "center", marginBottom: 8 },
});
