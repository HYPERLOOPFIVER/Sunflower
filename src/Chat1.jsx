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
  orderBy,
  limit,
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
import { formatDistanceToNow } from 'date-fns';

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
  const [lastMessages, setLastMessages] = useState({});
  const [chattedUsers, setChattedUsers] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const fetchChattedUsers = async () => {
      try {
        const messagesRef = collection(db, "messages");
        const q1 = query(messagesRef, where("receiverId", "==", auth.currentUser?.uid));
        const q2 = query(messagesRef, where("senderId", "==", auth.currentUser?.uid));
        
        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const chattedUserIds = new Set();
        snapshot1.docs.forEach(doc => chattedUserIds.add(doc.data().senderId));
        snapshot2.docs.forEach(doc => chattedUserIds.add(doc.data().receiverId));
        
        setChattedUsers(chattedUserIds);
      } catch (error) {
        console.error("Error fetching chatted users:", error);
      }
    };

    fetchChattedUsers();
  }, []);

  useEffect(() => {
    // Listen for unread messages
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
    const fetchLastMessages = async () => {
      if (chattedUsers.size === 0) return;
  
      const newLastMessages = {};
  
      try {
        // Query for messages where the current user is either the sender or receiver
        const messagesRef = collection(db, "messages");
        const q = query(
          messagesRef,
          or(
            where("senderId", "==", auth.currentUser?.uid),
            where("receiverId", "==", auth.currentUser?.uid)
          ),
          orderBy("timestamp", "desc")
        );
  
        const querySnapshot = await getDocs(q);
  
        // Create a map to store the last message for each user
        const lastMessageMap = new Map();
  
        querySnapshot.docs.forEach((doc) => {
          const message = doc.data();
          const otherUserId = message.senderId === auth.currentUser?.uid ? message.receiverId : message.senderId;
  
          // If this message is newer than the one stored, update the map
          if (!lastMessageMap.has(otherUserId)) {
            lastMessageMap.set(otherUserId, message);
          }
        });
  
        // Convert the map to the format expected by the state
        lastMessageMap.forEach((message, userId) => {
          newLastMessages[userId] = {
            text: message.text,
            timestamp: message.timestamp,
            senderId: message.senderId,
          };
        });
  
        setLastMessages(newLastMessages);
      } catch (error) {
        console.error("Error fetching last messages:", error);
      }
    };
  
    fetchLastMessages();
  }, [chattedUsers]);

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
        
        // Sort users by last message timestamp (newest first)
        interactedUsers.sort((a, b) => {
          const timestampA = lastMessages[a.id]?.timestamp?.toDate() || new Date(0);
          const timestampB = lastMessages[b.id]?.timestamp?.toDate() || new Date(0);
          return timestampB - timestampA; // Descending order (newest first)
        });
        
        setUsers(interactedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [chattedUsers, lastMessages]);

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
            (user.idkNumber?.toLowerCase() || "").includes(queryText.toLowerCase()) // Search by IDK Number
        );

      setSearchResults(searchedUsers);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setLoading(false);
    }
  };

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

  // Format the timestamp to display like WhatsApp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // If it's today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's within the last week, show day
    if (now - date < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chathome-container">
      
      <div className="chathome">
        <div className="chathome-navbar">
          <h1 className="chathome-logo">Sunflower 🌻</h1>

          <Link to="/kgon" className="chathome-profile-link">
            <SiNextra className="chathome-profile-icon" />
          </Link>
          <Link to="/profile" className="chathome-profile-link">
            <CgProfile className="chathome-profile-icon" />
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search by IDK Number..."
          value={search}
          onChange={handleSearch}
          className="chathome-search-bar"
        />

        {loading ? (
          <center>
            <div className="chathome-loading-spinner">
              <l-ring color="white"></l-ring>
            </div>
          </center>
        ) : search.length > 0 ? (
          searchResults.length === 0 ? (
            <div>
              <DotLottieReact
                src="https://lottie.host/d244deba-2fac-41c3-870d-cf357d32857e/OJULAfMPJz.lottie"
                loop
                autoplay
              />
              <center>
                <h3 className="chathome-no-user-found">User Not Found!</h3>
              </center>
            </div>
          ) : (
            searchResults.map((user) => (
              <div key={user.id} onClick={() => handleUserClick(user)} className="chathome-user-item">
                <div className="user-avatar-container">
                  <img
                    src={user.photoURL || "https://www.kravemarketingllc.com/wp-content/uploads/2018/09/placeholder-user-500x500.png"}
                    alt={user.idkNumber || "User"}
                    className="user-avatar"
                  />
                  {unreadMessages[user.id] && <div className="notification-dot"></div>}
                </div>
                <div className="user-chat-info">
                  <div className="user-chat-header">
                    <p className="user-chat-name">{user.idkNumber || "Unknown User"}</p>
                    <span className="user-chat-time">
                      {lastMessages[user.id] ? formatMessageTime(lastMessages[user.id].timestamp) : ""}
                    </span>
                  </div>
                  <div className="user-chat-message-preview">
                    {lastMessages[user.id] ? (
                      <p className="last-message-text">
                        {lastMessages[user.id].senderId === auth.currentUser?.uid ? "You: " : ""}
                        {lastMessages[user.id].text?.length > 30
                          ? `${lastMessages[user.id].text.substring(0, 30)}...`
                          : lastMessages[user.id].text}
                      </p>
                    ) : (
                      <p className="no-messages">No messages yet</p>
                    )}
                    {unreadMessages[user.id] && <span className="unread-count">1</span>}
                  </div>
                </div>
              </div>
            ))
          )
        ) : users.length === 0 ? (
          <div>
            <DotLottieReact
              src="https://lottie.host/449250f2-15a8-4ce8-b1de-cf806536d750/IyOCmU4J65.lottie"
              loop
              autoplay
            />
            <center>
              <h3 className="chathome-no-user-found">START CHATTING</h3>
            </center>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} onClick={() => handleUserClick(user)} className="chathome-user-item">
              <div className="user-avatar-container">
                <img
                  src={user.photoURL || "https://www.kravemarketingllc.com/wp-content/uploads/2018/09/placeholder-user-500x500.png"}
                  alt={user.idkNumber || "User"}
                  className="user-avatar"
                />
                {unreadMessages[user.id] && <div className="notification-dot"></div>}
              </div>
              <div className="user-chat-info">
                <div className="user-chat-header">
                  <p className="user-chat-name">{user.idkNumber || "Unknown User"}</p>
                  <span className="user-chat-time">
                    {lastMessages[user.id] ? formatMessageTime(lastMessages[user.id].timestamp) : ""}
                  </span>
                </div>
                <div className="user-chat-message-preview">
                  {lastMessages[user.id] ? (
                    <p className="last-message-text">
                      {lastMessages[user.id].senderId === auth.currentUser?.uid ? "You: " : ""}
                      {lastMessages[user.id].text?.length > 30
                        ? `${lastMessages[user.id].text.substring(0, 30)}...`
                        : lastMessages[user.id].text}
                    </p>
                  ) : (
                    <p className="no-messages">No messages yet</p>
                  )}
                  {unreadMessages[user.id] && <span className="unread-count">1</span>}
                </div>
              </div>
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