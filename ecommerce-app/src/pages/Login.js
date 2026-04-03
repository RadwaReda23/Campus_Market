// src/pages/Login.js
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const history = useNavigate(); // للتنقل بين الصفحات

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Please enter email and password");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Login successful!");
      history("/home"); // بعد تسجيل الدخول
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Login</h2>
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>Login</button>
        </form>

        {/* زر نسيان الباسورد */}
        <p style={{ textAlign: "center", marginTop: "15px" }}>
          <button 
            style={styles.linkButton} 
            onClick={() => history("/reset")} // رابط صفحة ForgetPassword/ResetPassword
          >
            Forgot Password?
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

export default Login;