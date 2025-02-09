import React, { useState, useEffect } from "react";
import { db, auth } from "./Firebase";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";

const Party = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [musicUrl, setMusicUrl] = useState("");

  useEffect(() => {
    const q = query(collection(db, "partyMessages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;

    await addDoc(collection(db, "partyMessages"), {
      text: newMessage,
      sender: auth.currentUser.displayName,
      timestamp: new Date()
    });

    setNewMessage("");
  };

  return (
    <div>
      <h2>🎉 Party Chat 🎶</h2>

      {/* Music Player */}
      <input 
        type="text" 
        placeholder="Enter music URL (YouTube or MP3)" 
        value={musicUrl} 
        onChange={(e) => setMusicUrl(e.target.value)} 
      />
      {musicUrl && (
        <iframe 
          width="100%" 
          height="200" 
          src={musicUrl.replace("watch?v=", "embed/")} 
          title="Party Music" 
          allow="autoplay"
        ></iframe>
      )}

      {/* Chat Section */}
      <div>
        {messages.map((msg) => (
          <p key={msg.id}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input 
          value={newMessage} 
          onChange={(e) => setNewMessage(e.target.value)} 
          placeholder="Type a message" 
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Party;
