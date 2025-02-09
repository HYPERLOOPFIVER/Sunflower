import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./Firebase";

export const usePartyMessages = (partyId) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const partyRef = doc(db, "parties", partyId);
    const unsubscribe = onSnapshot(partyRef, (doc) => {
      setMessages(doc.data()?.messages || []);
    });

    return () => unsubscribe();
  }, [partyId]);

  return messages;
};
