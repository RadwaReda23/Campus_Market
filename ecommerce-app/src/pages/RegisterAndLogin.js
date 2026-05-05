import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function SignUp() {
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (!username || !email || !password || !confirmPassword) {
      setError("كل الحقول مطلوبة");
      return;
    }

    if (password !== confirmPassword) {
      setError("كلمة المرور غير متطابقة");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: username,
      });

      await setDoc(doc(db, "users", user.uid), {
        name: username,
        email: email,
      });

      alert("تم إنشاء الحساب بنجاح");
      navigate("/home");
    } catch (err) {
      // ترجمة أشهر أخطاء Firebase
      if (err.code === "auth/email-already-in-use") {
        setError("هذا البريد الإلكتروني مستخدم بالفعل");
      } else if (err.code === "auth/invalid-email") {
        setError("البريد الإلكتروني غير صالح");
      } else if (err.code === "auth/weak-password") {
        setError("كلمة المرور ضعيفة جداً");
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
        <h2>إنشاء حساب جديد</h2>

        <form onSubmit={handleSignUp} style={styles.form}>
          <input name="username" placeholder="اسم المستخدم" style={styles.input} />

          <input name="email" type="email" placeholder="البريد الإلكتروني" style={styles.input} />

          <input name="password" type="password" placeholder="كلمة المرور" style={styles.input} />

          <input name="confirmPassword" type="password" placeholder="تأكيد كلمة المرور" style={styles.input} />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.button}>
            إنشاء حساب
          </button>
        </form>

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          لديك حساب بالفعل؟{" "}
          <button style={styles.linkButton} onClick={() => navigate("/login")}>
            تسجيل الدخول
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
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginTop: "5px",
  },
};

export default SignUp;