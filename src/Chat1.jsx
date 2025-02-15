import { useEffect, useState } from "react";
import { db, auth } from "./Firebase";
import {
  collection,
  query,
  getDocs,
  onSnapshot,
  where,
  addDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import ChatWindow from "./ChatWindow";
import "./home.css";
import { CgProfile } from "react-icons/cg";
import { Link } from "react-router-dom";
import { FaHistory } from "react-icons/fa";
import { waveform } from 'ldrs';
import 'ldrs/ring';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { SiNextra } from "react-icons/si";
import { useNavigate } from "react-router-dom";
// Sound notification function
const playNotificationSound = () => {
  const audio = new Audio("/path/to/notification-sound.mp3"); // Update path to actual sound file
  audio.play();
};

const Chathome = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [chattedUsers, setChattedUsers] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  useEffect(() => {
    const fetchChattedUsers = async () => {
      try {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, where("receiverId", "==", auth.currentUser?.uid));
        const querySnapshot = await getDocs(q);
        const chattedUserIds = querySnapshot.docs.map((doc) => doc.data().senderId);
        setChattedUsers(new Set(chattedUserIds));
      } catch (error) {
        console.error("Error fetching chatted users:", error);
      }
    };

    fetchChattedUsers();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "messages"),
      (snapshot) => {
        let newUnreadMessages = { ...unreadMessages };
        snapshot.docs.forEach((doc) => {
          const message = doc.data();
          if (message.receiverId === auth.currentUser?.uid && !message.read) {
            if (!newUnreadMessages[message.senderId]) {
              playNotificationSound(); // Play sound only if it's a new unread message
            }
            newUnreadMessages[message.senderId] = true;
          }
        });

        setUnreadMessages(newUnreadMessages);
      },
      (error) => {
        console.error("Error fetching messages:", error);
      }
    );

    return () => unsubscribe();
  }, [unreadMessages]);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const allUsers = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.id !== auth.currentUser?.uid);

        const interactedUsers = allUsers.filter((user) => chattedUsers.has(user.id));
        setUsers(interactedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [chattedUsers]);

  const handleSearch = async (e) => {
    const queryText = e.target.value;
    setSearch(queryText);

    if (queryText.trim() === "") {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const searchedUsers = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (user) =>
            user.id !== auth.currentUser.uid &&
            (user.name?.toLowerCase() || "").includes(queryText.toLowerCase())
        );

      setSearchResults(searchedUsers);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

  

 

  // Remove selectedUser state
  // const [selectedUser, setSelectedUser] = useState(null);

  const handleUserClick = async (user) => {
    // Mark messages as read
    const userMessagesRef = collection(db, "messages");
    const q = query(
      userMessagesRef,
      where("senderId", "==", user.id),
      where("receiverId", "==", auth.currentUser?.uid),
      where("read", "==", false)
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.docs.forEach(async (messageDoc) => {
      const messageRef = doc(db, "messages", messageDoc.id);
      await updateDoc(messageRef, { read: true });
    });

    // Navigate to chat window
    navigate(`/chatwindow/${user.id}`);
  };

  return (
    <div className="chat-container">
      <h2>idk</h2>
      <div className="chat-sidebar">
        <div className="navbar">
          <h1 className="log">IDK</h1>

          <Link to="/kgon" className="profile-link">
            <SiNextra className="profile-con" />
          </Link>
          <Link to="/profile" className="profile-link">
            <CgProfile className="profile-icon" />
          </Link>
        </div>

       
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={handleSearch}
          className="search-bar"
        />

        {loading ? (
      <center> <div className="loadk"><l-ring   color="white"></l-ring> </div></center>

        ) : search.length > 0 ? (
          searchResults.length === 0 ? (
            <div> <DotLottieReact
            src="https://lottie.host/d244deba-2fac-41c3-870d-cf357d32857e/OJULAfMPJz.lottie"
            loop
            autoplay
            
          />
          <center><h3 className="opi">User Not Found!</h3></center> </div>
          ) : (
            searchResults.map((user) => (
              <div key={user.id} onClick={() => handleUserClick(user)} className="user-item">
                <div className="user-avatar-container">
                  <img
                    src={user.photoURL || "https://www.kravemarketingllc.com/wp-content/uploads/2018/09/placeholder-user-500x500.png"}
                    alt={user.name || "User"}
                    className="user-avatar"
                  />
                  {unreadMessages[user.id] && <div className="notification-dot"></div>}
                </div>
                <p>{user.name || "Unknown User"}</p>
              </div>
            ))
          )
        ) : users.length === 0 ? (
          <div><DotLottieReact
          src="https://lottie.host/449250f2-15a8-4ce8-b1de-cf806536d750/IyOCmU4J65.lottie"
          loop
          autoplay
        />
     <center>   <h3 className="opi">START CHATTING</h3></center></div>
        ) : (
          users.map((user) => (
            <div key={user.id} onClick={() => handleUserClick(user)} className="user-item">
              <div className="user-avatar-container">
                <img
                  src={user.photoURL || "https://www.kravemarketingllc.com/wp-content/uploads/2018/09/placeholder-user-500x500.png"}
                  alt={user.name || "User"}
                  className="user-avatar"
                />
                {unreadMessages[user.id] && <div className="notification-dot"></div>}
              </div>
              <p>{user.name || "Unknown User"}</p>
            </div>
          ))
        )}
      </div>
      
      <div className="chat-content">
        {selectedUser ? <ChatWindow selectedUser={selectedUser} /> : <p>Select a user to chat</p>}
      </div>
      
    </div>
  );
};

export default Chathome;
