// src/pages/ResetPassword.js
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!email) {
      setMessage("من فضلك أدخل البريد الإلكتروني");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("تم إرسال رابط إعادة تعيين كلمة المرور، تحقق من البريد الوارد أو الرسائل غير المرغوب فيها");

      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setMessage("البريد الإلكتروني غير موجود");
      } else if (err.code === "auth/invalid-email") {
        setMessage("البريد الإلكتروني غير صالح");
      } else if (err.code === "auth/network-request-failed") {
        setMessage("تحقق من اتصال الإنترنت");
      } else {
        setMessage("حدث خطأ، حاول مرة أخرى");
      }
    }
  };

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
      fontSize: "14px",
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
    message: {
      fontSize: "14px",
      marginTop: "10px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور</p>

        <form onSubmit={handleReset} style={styles.form}>
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          {message && (
            <p
              style={{
                ...styles.message,
                color: message.includes("تم") ? "green" : "red",
              }}
            >
              {message}
            </p>
          )}

          <button type="submit" style={styles.button}>
            إعادة تعيين كلمة المرور
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;