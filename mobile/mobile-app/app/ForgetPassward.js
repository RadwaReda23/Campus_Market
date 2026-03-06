// app/forgetPassword.js
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { auth } from "./firebase";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    setMessage("");

    if (!email) {
      setMessage("Please enter your email");
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        setMessage("Email not found");
      } else {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent!");
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forget Password</Text>
        <Text style={styles.subtitle}>Enter your email to reset password</Text>

        <TextInput
          placeholder="Enter Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {message ? (
          <Text
            style={[
              styles.message,
              message === "Password reset email sent!"
                ? styles.success
                : styles.error,
            ]}
          >
            {message}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#667eea",
  },
  card: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 15,
    width: 320,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
  message: {
    textAlign: "center",
    marginBottom: 10,
  },
  success: {
    color: "green",
  },
  error: {
    color: "red",
  },
});