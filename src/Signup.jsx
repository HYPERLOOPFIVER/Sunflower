import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./Firebase";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './Signup.css'; // Add this CSS file to your project

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Name state
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
      });

      // Redirect to chat page
<<<<<<< HEAD
      navigate("/chat");
=======
      navigate("/home");
>>>>>>> 9c35781 (Initial commit)
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-box">
      <div className="logo">
<<<<<<< HEAD
          <img src="https://img.freepik.com/premium-vector/chat-logo_910989-37.jpg" alt="App Logo" className="app-logo" />
=======
        <center> <img src="https://img.freepik.com/premium-vector/chat-logo_910989-37.jpg" alt="App Logo" className="app-logo" /></center>
        <h3>India's First Most Amazing Chatting Service. From - Parikshit 😉😉😉</h3>
>>>>>>> 9c35781 (Initial commit)
        </div>
        <h2>Sign Up</h2>
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          <button type="submit" className="signup-button">Sign Up</button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
