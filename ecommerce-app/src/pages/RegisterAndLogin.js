// src/pages/SignUp.js
import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function SignUp() {
  const [error, setError] = useState("");
  const history = useNavigate(); // للتنقل بين الصفحات

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (!username || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // تحديث الاسم في Firebase Auth
      await updateProfile(userCredential.user, {
        displayName: username,
      });

      alert("SignUp successful!");
      history("/home");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Sign Up</h2>
        <form onSubmit={handleSignUp} style={styles.form}>
          <input name="username" placeholder="Username" style={styles.input} />
          <input name="email" type="email" placeholder="Email" style={styles.input} />
          <input name="password" type="password" placeholder="Password" style={styles.input} />
          <input name="confirmPassword" type="password" placeholder="Confirm Password" style={styles.input} />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>Sign Up</button>
        </form>

        {/* زر يوديك لصفحة تسجيل الدخول */}
        <p style={{ marginTop: "15px", textAlign: "center" }}>
          Already have an account?{" "}
          <button 
            style={styles.linkButton} 
            onClick={() => history("/login")}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    width: "400px",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "12px",
    margin: "10px 0",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "12px",
    marginTop: "20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#667eea",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  linkButton: {
    background: "none",
    border: "none",
    color: "#667eea",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: "14px",
    padding: 0,
    margin: 0,
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginTop: "5px",
  },
};

export default SignUp;