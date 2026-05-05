// src/pages/Login.js
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const history = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      return setError("من فضلك أدخل البريد الإلكتروني وكلمة المرور");
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("تم تسجيل الدخول بنجاح");
      history("/home");
    } catch (err) {
      // ترجمة أخطاء Firebase
      if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صالح");
      } else if (err.code === "auth/user-not-found") {
        setError("المستخدم غير موجود");
      } else if (err.code === "auth/wrong-password") {
        setError("كلمة المرور غير صحيحة");
      } else if (err.code === "auth/network-request-failed") {
        setError("تحقق من اتصال الإنترنت");
      } else {
        setError("حدث خطأ، حاول مرة أخرى");
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>تسجيل الدخول</h2>

        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button}>
            تسجيل الدخول
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "15px" }}>
          <button 
            style={styles.linkButton} 
            onClick={() => history("/reset")}
          >
            نسيت كلمة المرور؟
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