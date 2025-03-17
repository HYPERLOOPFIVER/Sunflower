import React, { useEffect, useState } from "react";
import { auth, db } from "./Firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut, sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import jsPDF from "jspdf";
import "./profile.css";
import { CircularProgress, Modal, Box, Typography, Button, TextField } from "@mui/material";

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [openDownloadModal, setOpenDownloadModal] = useState(false);
    const [downloadType, setDownloadType] = useState(null);

    // Reset password modal state
    const [openResetModal, setOpenResetModal] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    useEffect(() => {
        const fetchUserData = async (userId) => {
            try {
                const userRef = doc(db, "users", userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    const data = userSnap.data(); // Temporary variable fix
                    console.log("Fetched user data:", data);
                    setUser(data);
                    setNewName(data.name);
                } else {
                    setError("No such user!");
                }
            } catch (err) {
                setError("Failed to fetch user data.");
                console.error(err);
            } finally {
                setLoading(false); // Ensure loading is set to false at the right time
            }
        };

        // Use onAuthStateChanged to wait for user auth state
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchUserData(user.uid);
            } else {
                setError("No user is logged in.");
                setLoading(false);
            }
        });

        return () => unsubscribe(); // Cleanup the listener on unmount
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (err) {
            setError("Failed to log out.");
            console.error(err);
        }
    };

    const handleNameChange = async () => {
        if (newName.trim()) {
            try {
                const userRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userRef, { name: newName });
                setUser((prev) => ({ ...prev, name: newName }));
            } catch (err) {
                setError("Failed to update name.");
                console.error(err);
            }
        }
    };

    const downloadAsPDF = () => {
        setDownloading(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(16);
            doc.text("User Data Report", 10, 10);
            doc.setFontSize(12);
            let y = 20;

            const userDetails = `Name: ${user.name}\nEmail: ${user.email}\nPhone: ${user.idkNumber || "N/A"}`;
            const lines = doc.splitTextToSize(userDetails, 180);
            doc.text(lines, 10, y);
            y += lines.length * 6;

            doc.save("UserProfile.pdf");
        } catch (err) {
            setError("Failed to generate PDF.");
            console.error(err);
        } finally {
            setDownloading(false);
        }
    };

    const downloadAsHTML = () => {
        setDownloading(true);
        try {
            let htmlContent = `
                <h1>User Profile</h1>
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Phone:</strong> ${user.idkNumber || "N/A"}</p>
            `;

            const blob = new Blob([htmlContent], { type: "text/html" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "UserProfile.html";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setError("Failed to generate HTML.");
            console.error(err);
        } finally {
            setDownloading(false);
        }
    };

    const handleDownload = (type) => {
        setDownloadType(type);
        setOpenDownloadModal(true);
    };

    const confirmDownload = () => {
        setOpenDownloadModal(false);
        if (downloadType === "pdf") {
            downloadAsPDF();
        } else if (downloadType === "html") {
            downloadAsHTML();
        }
    };

    const openResetPasswordModal = () => {
        setConfirmEmail('');
        setResetMessage('');
        setOpenResetModal(true);
    };

    const confirmResetPassword = async () => {
        if (confirmEmail.trim() !== user.email) {
            setResetMessage("Entered email does not match your account email.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetMessage("Password reset email sent! Please check your inbox.");
        } catch (err) {
            setResetMessage("Failed to send password reset email.");
            console.error(err);
        }
        setOpenResetModal(false);
    };

    if (loading) {
        return (
            <div className="loading">
                <CircularProgress />
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <div className="loading">User data not found!</div>;
    }

    return (
        <div className="profile-container">
            
            <div className="profile-card">
                <img 
                    src={user.profilePic || ""} 
                    alt="Profile" 
                    className="profile-pic" 
                />
                <h2 className="name">{user.name || "No name set"}</h2>
                <p className="email"><strong>Email:</strong> {user.email}</p>
                <p className="phone"><strong>IDK Number:</strong> {user.idkNumber || "Not generated contact support"}</p>

                <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="name-input" 
                    placeholder="Change your name" 
                />
                <button className="change-name-btn" onClick={handleNameChange}>Update Name</button>

                <button className="logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>



            <Modal open={openDownloadModal} onClose={() => setOpenDownloadModal(false)}>
                <Box className="modal-box">
                    <Typography variant="h6">Confirm Download</Typography>
                    <Typography>Download data as {downloadType}?</Typography>
                    <Button onClick={confirmDownload}>Yes</Button>
                    <Button onClick={() => setOpenDownloadModal(false)}>Cancel</Button>
                </Box>
            </Modal>

            {error && <div className="error">{error}</div>}
            <p>hehehehhehe</p>
            <a href="https://www.instagram.com/emergeempathy/"><h2>Made by Parikshit</h2></a> 
            <a href="https://www.instagram.com/khushi_31111/"><h2>For Sakshiii</h2></a>
        </div>
    );
};

export default ProfilePage;
