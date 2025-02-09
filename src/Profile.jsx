import React, { useEffect, useState } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import "./profile.css";

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [newName, setNewName] = useState('');
    const [recentParties, setRecentParties] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            if (auth.currentUser) {
                const userRef = doc(db, "users", auth.currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setUser(userSnap.data());
                    setNewName(userSnap.data().name);
                } else {
                    console.error("No such user!");
                }
            } else {
                console.error("No user is logged in.");
            }
        };

        const fetchRecentParties = async () => {
            if (auth.currentUser) {
                const partiesRef = collection(db, "parties");
                const q = query(partiesRef, where("members", "array-contains", auth.currentUser.uid));
                const partySnap = await getDocs(q);
                
                const partiesData = partySnap.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id,
                    // Extract host ID from DocumentReference
                    hostid: doc.data().hostid?.id || 'No host ID' // Access the DocumentReference's ID property
                }));

                setRecentParties(partiesData);
            }
        };

        const loadData = async () => {
            setLoading(true);
            await fetchUserData();
            await fetchRecentParties();
            setLoading(false);
        };

        loadData();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        window.location.reload();
    };

    const handleNameChange = async () => {
        if (newName.trim()) {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, { name: newName });
            setUser(prev => ({ ...prev, name: newName }));
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (!user) {
        return <div className="loading">User data not found!</div>;
    }

    const profilePic = user.profilePic || "https://via.placeholder.com/100";

    return (
        <div className="profile-container">
            <div className="profile-card">
                <img 
                    src={profilePic} 
                    alt="Profile" 
                    className="profile-pic" 
                />
                <h2 className="name">{user.name || "No name set"}</h2>
                <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="name-input" 
                    placeholder="Change your name" 
                />
                <button className="change-name-btn" onClick={handleNameChange}>Update Name</button>
                <p className="email">{user.email}</p>
                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>
            
            <div className="recent-parties">
                <h3>Recent Parties</h3>
                {recentParties.length > 0 ? (
                    recentParties.map((party, index) => (
                        <div key={party.id || index} className="party-item">
                            <p>Party Name: {party.name}</p>
                            <p>Host ID: {party.hostid}</p>
                            {party.date && <p>Date: {new Date(party.date?.toDate()).toLocaleDateString()}</p>}
                        </div>
                    ))
                ) : (
                    <p>No recent parties.</p>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;