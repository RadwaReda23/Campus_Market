import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { auth } from "./firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { router } from "expo-router";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setMessage("");
    setSuccess(false);

    if (!email) {
      setMessage("من فضلك أدخل بريدك الإلكتروني");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());

      setSuccess(true);
      setMessage("تم إرسال رابط إعادة تعيين كلمة المرور! تحقق من بريدك الوارد.");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setMessage("البريد الإلكتروني غير موجود");
      } else {
        setMessage(err.message);
      }
      setSuccess(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>نسيت كلمة المرور</Text>
        <Text style={styles.subtitle}>أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور</Text>

        <TextInput
          placeholder="أدخل بريدك الإلكتروني"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {message ? (
          <Text style={[styles.message, success ? styles.success : styles.error]}>
            {message}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>إعادة تعيين كلمة المرور</Text>
        </TouchableOpacity>

        {/* العودة إلى تسجيل الدخول */}
        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={{ marginTop: 15 }}
        >
          <Text style={styles.linkText}>العودة إلى تسجيل الدخول</Text>
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
  message: { textAlign: "center", marginBottom: 10 },
  success: { color: "green" },
  error: { color: "red" },
});