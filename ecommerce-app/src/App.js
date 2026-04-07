import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Login from "./pages/Login";
import SignUp from "./pages/RegisterAndLogin";
import ForgetPassword from "./pages/forgetPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // إنشاء user document في Firestore لو مش موجود
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: currentUser.displayName || "",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            role: "طالب", // default - يقدر يغيره
            ratingSum: 0,
            ratingCount: 0,
            createdAt: new Date(),
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", background: "linear-gradient(135deg, #667eea, #764ba2)",
        color: "white", fontSize: 20, fontFamily: "Arial"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/home" /> : <SignUp />} />
        <Route path="/forget-password" element={<ForgetPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/home" element={user ? <Dashboard user={user} /> : <Navigate to="/signup" />} />
        <Route path="*" element={<Navigate to={user ? "/home" : "/signup"} />} />
      </Routes>
    </Router>
  );
}

export default App;