import axios from "axios";

const CLOUD_NAME = "dzf155vhq"; // Your Cloudinary Cloud Name
const UPLOAD_PRESET = "posts_certano"; // Create an unsigned upload preset

export const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, 
            formData
        );
        return response.data.secure_url;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        return null;
    }
};
