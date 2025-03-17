import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { auth } from "./Firebase";
import { onAuthStateChanged } from "firebase/auth";
import Login from "./Login";
import SignUp from "./Signup";
import Chathome from "./Chat1";
import ProfilePage from "./Profile";
import GlimpsePage from "./Glimpse";
import PartyList from "./PartyList"; // Party Selection Page
import PartyRoom from "./PartyRoom"; // Individual Party Chat Room
import PartyChat from "./PartyChat";
import Kgon from "./Links";
import { grid } from 'ldrs';
import './App.css';
import ChatWindow from "./ChatWindow";
import { setupPresence } from "./presence"; // Import the presence system
import Call from "./Call";

grid.register();

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [partyId, setPartyId] = useState(null); // Manage Party Room State

  // Initialize presence system when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setupPresence(user); // Initialize presence system
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <l-grid size="60" speed="1.5" color="black"></l-grid>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to="/home" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/home" /> : <SignUp />} />
        <Route path="/home" element={currentUser ? <Chathome /> : <Navigate to="/" />} />
        <Route path="/profile" element={currentUser ? <ProfilePage /> : <Navigate to="/" />} />
        <Route path="/call" element={currentUser ? <Call/> : <Navigate to="/" />} />
        <Route path="/chatwindow/:userId" element={<ChatWindow />} />
        <Route path="/glimpse" element={currentUser ? <GlimpsePage /> : <Navigate to="/" />} />
        <Route path="/kuo" element={currentUser ? <PartyChat /> : <Navigate to="/" />} />
        <Route path="/kgon" element={currentUser ? <Kgon /> : <Navigate to="/" />} />
        {/* Party Feature Routes */}
        <Route 
          path="/party" 
          element={currentUser ? <PartyList setPartyId={setPartyId} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/party-room" 
          element={currentUser && partyId ? <PartyRoom partyId={partyId} /> : <Navigate to="/party" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;