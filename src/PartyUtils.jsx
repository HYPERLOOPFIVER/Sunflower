import { db, auth } from "./firebase";
import { collection, addDoc, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";

export const createParty = async (partyName) => {
  const partyRef = collection(db, "parties");
  await addDoc(partyRef, {
    name: partyName,
    music: { track: "", isPlaying: false, timestamp: Date.now() },
    messages: [],
    members: [auth.currentUser.uid]
  });
};

export const joinParty = async (partyId) => {
  const partyRef = doc(db, "parties", partyId);
  await updateDoc(partyRef, {
    members: arrayUnion(auth.currentUser.uid)
  });
};

export const getParties = async () => {
  const querySnapshot = await getDocs(collection(db, "parties"));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
