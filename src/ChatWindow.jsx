import { useEffect, useState } from "react";
import { db, auth } from "./Firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import './cjs.css'
const ChatWindow = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!selectedUser) return;

    const chatId =
      auth.currentUser.uid > selectedUser.id
        ? `${auth.currentUser.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${auth.currentUser.uid}`;

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("chatId", "==", chatId), orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [selectedUser]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const chatId =
      auth.currentUser.uid > selectedUser.id
        ? `${auth.currentUser.uid}_${selectedUser.id}`
        : `${selectedUser.id}_${auth.currentUser.uid}`;

    await addDoc(collection(db, "messages"), {
      chatId,
      senderId: auth.currentUser.uid,
      receiverId: selectedUser.id,
      text: newMessage,
      timestamp: new Date(),
    });

    setNewMessage("");
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src={selectedUser.photoURL || "https://via.placeholder.com/40"} alt="User" />
        <h3>{selectedUser.name}</h3>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.senderId === auth.currentUser.uid ? "sent" : "received"}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default ChatWindow;
