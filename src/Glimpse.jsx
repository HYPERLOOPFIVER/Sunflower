import { useEffect, useState } from "react";
import { db, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "./Firebase";
import { getAuth } from "firebase/auth";
import axios from "axios"; // For Cloudinary upload

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dzf155vhq/upload";
const CLOUDINARY_UPLOAD_PRESET = "posts_certano"; // Replace with your preset

const GlimpsePage = () => {
    const [glimpses, setGlimpses] = useState([]);
    const [selectedGlimpse, setSelectedGlimpse] = useState(null);
    const [uploading, setUploading] = useState(false);
    const auth = getAuth();
    const currentUser = auth.currentUser;

    useEffect(() => {
        const fetchChatContacts = async () => {
            if (!currentUser) return [];

            try {
                const chatQuery = query(
                    collection(db, "chats"),
                    where("participants", "array-contains", currentUser.uid)
                );

                const chatSnapshot = await getDocs(chatQuery);
                const chatContacts = new Set();

                chatSnapshot.docs.forEach(doc => {
                    const { participants } = doc.data();
                    participants.forEach(user => {
                        if (user !== currentUser.uid) chatContacts.add(user);
                    });
                });

                return Array.from(chatContacts);
            } catch (error) {
                console.error("Error fetching chat contacts:", error);
                return [];
            }
        };

        const fetchGlimpses = async () => {
            const contacts = await fetchChatContacts();
            if (contacts.length === 0) return;

            try {
                const glimpseQuery = query(
                    collection(db, "glimpses"),
                    where("userId", "in", contacts),
                    where("expiresAt", ">", Date.now()),
                    orderBy("createdAt", "desc")
                );

                const glimpseSnapshot = await getDocs(glimpseQuery);
                const glimpsesData = glimpseSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setGlimpses(glimpsesData);
            } catch (error) {
                console.error("Error fetching glimpses:", error);
            }
        };

        fetchGlimpses();
    }, [currentUser]);

    const handleUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const response = await axios.post(CLOUDINARY_URL, formData);
            const mediaUrl = response.data.secure_url;

            await addDoc(collection(db, "glimpses"), {
                userId: currentUser.uid,
                mediaUrl,
                createdAt: serverTimestamp(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
            });

            alert("Glimpse uploaded successfully!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload glimpse.");
        }

        setUploading(false);
    };

    return (
        <div className="glimpse-container">
            <h1>Glimpses (Like WhatsApp Status)</h1>

            {/* Upload Glimpse Button */}
            <label className="upload-button">
                {uploading ? "Uploading..." : "Upload Glimpse"}
                <input type="file" onChange={handleUpload} accept="image/*,video/*" hidden />
            </label>

            <div className="glimpses-list">
                {glimpses.length === 0 ? <p>No active glimpses</p> : null}
                {glimpses.map(glimpse => (
                    <div 
                        key={glimpse.id} 
                        className="glimpse-item"
                        onClick={() => setSelectedGlimpse(glimpse.mediaUrl)}
                    >
                        <img 
                            src={glimpse.mediaUrl} 
                            alt="Glimpse" 
                            className="glimpse-thumbnail" 
                        />
                    </div>
                ))}
            </div>

            {/* Fullscreen View */}
            {selectedGlimpse && (
                <div className="glimpse-fullscreen" onClick={() => setSelectedGlimpse(null)}>
                    <span className="glimpse-close">&times;</span>
                    <img src={selectedGlimpse} alt="Full View" />
                </div>
            )}
        </div>
    );
};

export default GlimpsePage;
