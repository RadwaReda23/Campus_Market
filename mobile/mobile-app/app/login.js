import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { auth } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setMessage("");
    if (!email || !password) {
      setMessage("Please enter email and password");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/ForgetPassword")} style={{ marginTop: 15 }}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/Register")} style={{ marginTop: 10 }}>
          <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#667eea" },
  card: { backgroundColor: "#fff", padding: 30, borderRadius: 15, width: 320 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 5, textAlign: "center" },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginBottom: 10 },
  button: { backgroundColor: "#667eea", padding: 12, borderRadius: 8, marginTop: 10 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  linkText: { color: "#667eea", textAlign: "center", textDecorationLine: "underline" },
  message: { textAlign: "center", color: "red", marginTop: 10 },
});