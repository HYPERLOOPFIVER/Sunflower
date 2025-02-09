import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const useMusicState = (partyId) => {
  const [music, setMusic] = useState({ track: "", isPlaying: false });

  useEffect(() => {
    const partyRef = doc(db, "parties", partyId);
    const unsubscribe = onSnapshot(partyRef, (doc) => {
      setMusic(doc.data()?.music || { track: "", isPlaying: false });
    });

    return () => unsubscribe();
  }, [partyId]);

  return music;
};
