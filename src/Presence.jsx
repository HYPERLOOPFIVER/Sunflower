import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp as dbServerTimestamp } from "firebase/database";

export const setupPresence = (user) => {
  const rtdb = getDatabase();
  const presenceRef = ref(rtdb, `presence/${user.uid}`);
  
  const connectedRef = ref(rtdb, '.info/connected');
  
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      set(presenceRef, {
        status: 'online',
        lastChanged: dbServerTimestamp()
      });
      
      onDisconnect(presenceRef).set({
        status: 'offline',
        lastChanged: dbServerTimestamp()
      });
    }
  });
};