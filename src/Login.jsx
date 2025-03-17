import React, { useState } from "react";
import { auth, db } from "./Firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Import the custom CSS
import { Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Handle Login
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Store user data in localStorage
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      navigate("/"); // Redirect to the homepage or dashboard
    } catch (error) {
      alert("Error logging in");
    }
  };

  // Handle Sign Up
  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
      });

      // Store user data in localStorage after signup
      const userData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
      };
      localStorage.setItem("user", JSON.stringify(userData));

      navigate("/"); // Redirect to the homepage or dashboard
    } catch (error) {
      alert("Error signing up");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo">
         <h1 className="newop">Sunflower 🌻</h1>
         <p>From Saddest person of world <strong>Parikshit</strong></p>
        </div>
        <h2>Welcome Back</h2>
     
        <div className="input-container">
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
        </div>
        <button className="login-button" onClick={handleLogin}>Login</button>
        <div className="separator">or</div>
        <Link to="/signup">
          <button className="signup-button">Sign Up</button>
        </Link>
      </div>
    </div>
  );
};

export default Login;
