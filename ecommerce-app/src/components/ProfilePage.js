import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function ProfilePage() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    imageURL: "https://via.placeholder.com/120"
  });

  const userId = "testUser";

  // 🔹 get user data
  useEffect(() => {
    const getUser = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUser(docSnap.data());
        }
      } catch (error) {
        console.log(error);
      }
    };

    getUser();
  }, []);

  // 🔹 handle input
  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
  };

  // 🔹 update data
  const handleUpdate = async () => {
    try {
      const docRef = doc(db, "users", userId);
      await updateDoc(docRef, user);
      alert("Updated Successfully ✅");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        <h2 style={styles.title}>My Profile</h2>

        <img
          src={user.imageURL}
          alt="profile"
          style={styles.image}
        />

        <input
          type="text"
          name="name"
          placeholder="Enter your name"
          value={user.name}
          onChange={handleChange}
          style={styles.input}
        />

        <input
          type="email"
          name="email"
          placeholder="Enter your email"
          value={user.email}
          onChange={handleChange}
          style={styles.input}
        />

        <button
          onMouseOver={(e) => (e.target.style.background = "#b8962e")}
          onMouseOut={(e) => (e.target.style.background = "#d4af37")}
          onClick={handleUpdate}
          style={styles.button}
        >
          Update Profile
        </button>

      </div>
    </div>
  );
}

export default ProfilePage;


// 🎨 Styles (متناسق مع الأخضر والدهبي)
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f6f8"
  },

  card: {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "15px",
    width: "350px",
    textAlign: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    borderTop: "5px solid #1f6f5d"
  },

  title: {
    marginBottom: "20px",
    color: "#1f6f5d",
    fontWeight: "bold"
  },

  image: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    marginBottom: "20px",
    objectFit: "cover",
    border: "3px solid #d4af37"
  },

  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    outline: "none",
    fontSize: "14px"
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "#d4af37",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold"
  }
};