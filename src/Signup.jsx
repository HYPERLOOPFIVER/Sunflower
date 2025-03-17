import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider
} from "firebase/auth";
import { auth, db } from "./Firebase";
import { setDoc, doc, getDocs, collection, query, where, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import './Signup.css';
import { Link } from "react-router-dom";
const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  // Function to generate a unique 8-digit ID
  // Function to generate a unique 8-digit ID as a string
const generateUniqueIDKNumber = async () => {
  let idkNumber;
  let isUnique = false;

  while (!isUnique) {
    idkNumber = (Math.floor(10000000 + Math.random() * 90000000)).toString(); // Convert to string
    const usersQuery = query(collection(db, "users"), where("idkNumber", "==", idkNumber));
    const querySnapshot = await getDocs(usersQuery);
    if (querySnapshot.empty) isUnique = true; // Ensure uniqueness
  }

  return idkNumber;
};


  // Function to save user data in Firestore
  const saveUserToDB = async (user, providerName) => {
    if (!user) return;

    const idkNumber = await generateUniqueIDKNumber(); // Generate unique IDK number

    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || name,
      email: user.email,
      provider: providerName,
      idkNumber, // Store the unique IDK number
      lastTyping: null,
      lastLogin: serverTimestamp(),
      active: true
    }, { merge: true });

    navigate("/home");
  };

  // Handle Email & Password Signup
  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToDB(userCredential.user, "email");
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  // Handle Social Logins
  const handleSocialLogin = async (provider, providerName) => {
    try {
      const result = await signInWithPopup(auth, provider);
      await saveUserToDB(result.user, providerName);
    } catch (error) {
      console.error(`${providerName} login error:`, error);
    }
  };

  return (
    <div className="signup-container">
    
      <div className="signup-box">
       <h1 className="newop">Sunflower 🌻</h1>
        <h3>From the Saddest person of world 😭😭😭<strong>Parikshit</strong></h3>
        <h2>Sign Up</h2>
        
        <form onSubmit={handleSignUp}>
          <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required />
          <button type="submit" className="signup-button">Sign Up</button>
        </form>

        <hr />

        <Link to="/Login">
          <button className="login-button">Login</button>
        </Link>
      </div>
    </div>
  );
};

export default SignUp;
