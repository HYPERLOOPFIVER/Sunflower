import { useState } from "react";
import { db, addDoc, collection } from "./Firebase";
import { uploadToCloudinary } from "./uploadToCloudinary";

const GlimpseUpload = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        if (!file) return alert("Please select a file!");

        setLoading(true);
        const url = await uploadToCloudinary(file);

        if (url) {
            await addDoc(collection(db, "glimpses"), {
                mediaUrl: url,
                createdAt: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24-hour expiration
                type: file.type.includes("video") ? "video" : "image"
            });
            alert("Glimpse uploaded successfully!");
        } else {
            alert("Upload failed.");
        }
        setLoading(false);
    };

    return (
        <div>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={handleUpload} disabled={loading}>
                {loading ? "Uploading..." : "Upload Glimpse"}
            </button>
        </div>
    );
};

export default GlimpseUpload;
