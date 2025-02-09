// ChatUtils.jsx
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth, db } from "./Firebase";

// Function to send a message to the party
export const sendMessage = async (partyId, message) => {
  const partyRef = doc(db, "parties", partyId);
  await updateDoc(partyRef, {
    messages: arrayUnion({
      sender: auth.currentUser.displayName,
      text: message,
      timestamp: new Date().toISOString()
    })
  });
};

// Custom hook to fetch and listen for messages in a party
export const usePartyMessages = (partyId) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const partyRef = doc(db, "parties", partyId);

    // Set up listener for real-time updates
    const unsubscribe = onSnapshot(partyRef, (docSnap) => {
      if (docSnap.exists()) {
        const partyData = docSnap.data();
        setMessages(partyData.messages || []);
      }
    });

    // Clean up listener on component unmount
    return () => unsubscribe();
  }, [partyId]);

  return messages;
};
