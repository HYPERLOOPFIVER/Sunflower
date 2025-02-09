import React, { useEffect, useState } from "react";
import { getParties, createParty, joinParty } from "./partyUtils";

const PartyList = ({ setPartyId }) => {
  const [parties, setParties] = useState([]);
  const [partyName, setPartyName] = useState("");

  useEffect(() => {
    getParties().then(setParties);
  }, []);

  return (
    <div>
      <h2>Available Parties</h2>
      <input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Enter party name" />
      <button onClick={() => createParty(partyName)}>Create Party</button>

      {parties.map((party) => (
        <div key={party.id}>
          <h3>{party.name}</h3>
          <button onClick={() => setPartyId(party.id)}>Join</button>
        </div>
      ))}
    </div>
  );
};

export default PartyList;
