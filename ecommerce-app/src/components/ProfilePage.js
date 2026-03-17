import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function ProfilePage() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    imageURL: ""
  });

  const userId = "testUser"; 

  
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

  
  const handleChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value
    });
  };

  
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
    <div>
      <h2>My Profile</h2>

      <img src={user.imageURL} alt="profile" width="120" height="120" />

      <input
        type="text"
        name="name"
        value={user.name}
        onChange={handleChange}
        placeholder="Enter your name"
      />

      <input
        type="email"
        name="email"
        value={user.email}
        onChange={handleChange}
        placeholder="Enter your email"
      />

      <button onClick={handleUpdate}>Update Profile</button>
    </div>
  );
}

export default ProfilePage;