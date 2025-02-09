// PartyRoom.jsx
import React, { useState } from "react";
import { sendMessage, usePartyMessages } from "./ChatUtils";  // Ensure this is correct
import MusicPlayer from "./MusicPlayer";

const PartyRoom = ({ partyId }) => {
  const [message, setMessage] = useState("");
  const messages = usePartyMessages(partyId);

  return (
    <div>
      <h2>Party Room</h2>
      <MusicPlayer partyId={partyId} />

      <div>
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>

      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={() => sendMessage(partyId, message)}>Send</button>
    </div>
  );
};

export default PartyRoom;
