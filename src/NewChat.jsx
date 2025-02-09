import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "./Firebase";
import { useNavigate } from "react-router-dom";

const NewChat = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      const userCollection = await getDocs(collection(db, "users"));
      setUsers(userCollection.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Start New Chat</h2>
      <ul>
        {users.map((user) =>
          user.id !== auth.currentUser?.uid ? (
            <li
              key={user.id}
              className="p-3 bg-gray-100 rounded-lg cursor-pointer mb-2"
              onClick={() => navigate(`/chat/${user.id}`)}
            >
              {user.name}
            </li>
          ) : null
        )}
      </ul>
    </div>
  );
};

export default NewChat;
