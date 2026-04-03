import { useState } from "react";
import { fetchSignInMethodsForEmail, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email) { setMessage("Please enter your email"); return; }
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

  const styles = {
    container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "linear-gradient(135deg, #667eea, #764ba2)", fontFamily: "Arial, sans-serif" },
    card: { background: "#fff", padding: "40px", borderRadius: "15px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", width: "350px", textAlign: "center" },
    title: { margin: "0 0 10px 0", color: "#333" },
    subtitle: { margin: "0 0 30px 0", color: "#666", fontSize: "14px" },
    form: { display: "flex", flexDirection: "column" },
    input: { padding: "12px", margin: "10px 0", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" },
    button: { padding: "12px", marginTop: "20px", borderRadius: "8px", border: "none", backgroundColor: "#667eea", color: "#fff", fontSize: "16px", cursor: "pointer" },
    message: { color: message === "Password reset email sent!" ? "green" : "red", fontSize: "13px", marginTop: "5px" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Forget Password</h2>
        <p style={styles.subtitle}>Enter your email to reset password</p>
        <form onSubmit={handleReset} style={styles.form}>
          <input type="email" placeholder="Enter Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
          {message && <p style={styles.message}>{message}</p>}
          <button type="submit" style={styles.button}>Reset Password</button>
        </form>
      </div>
    </div>
  );
}

export default ForgetPassword;