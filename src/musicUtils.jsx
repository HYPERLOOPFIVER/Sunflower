import { useState, useEffect } from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "./Firebase";

/**
 * Custom hook to listen to music state in Firestore.
 */
export const useMusicState = (partyId) => {
  const [music, setMusic] = useState({ track: null, isPlaying: false });

  useEffect(() => {
    if (!partyId) return;

    const partyRef = doc(db, "parties", partyId);
    
    // Listen to real-time updates from Firestore
    const unsubscribe = onSnapshot(partyRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setMusic(data.music || { track: null, isPlaying: false });
      }
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [partyId]);

  return music;
};

/**
 * Function to update the music state in Firestore.
 */
export const updateMusic = async (partyId, trackUrl, isPlaying) => {
  if (!partyId) return;

  const partyRef = doc(db, "parties", partyId);

  try {
    await updateDoc(partyRef, {
      music: { track: trackUrl, isPlaying, timestamp: new Date().getTime() }
    });
  } catch (error) {
    console.error("Error updating music state:", error);
  }
};
