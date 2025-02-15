import React, { useEffect, useState, useRef, useCallback } from "react";
import { db, auth } from "./firebase";
import { 
  collection, addDoc, updateDoc, arrayUnion, 
  doc, onSnapshot, serverTimestamp, getDoc 
} from "firebase/firestore";
import "./Yuo.css";
import 'ldrs/ring';
import { runTransaction } from "firebase/firestore";

const getYouTubeVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const PartyChat = () => {
  const [partyId, setPartyId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [party, setParty] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playerState, setPlayerState] = useState(-1);
  const [videoUrl, setVideoUrl] = useState("");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const playerRef = useRef(null);
  const user = auth.currentUser;
  const messagesEndRef = useRef(null);

  // YouTube Player Initialization
  const loadYouTubeAPI = useCallback(() => {
    if (window.YT && window.YT.Player) {
      initializePlayer();
      return;
    }
  
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.defer = true;
    document.body.appendChild(tag);
  
    tag.onload = () => {
      if (window.YT && window.YT.Player) {
        initializePlayer();
      }
    };
  
    window.onYouTubeIframeAPIReady = () => {
      initializePlayer();
    };
  }, []);
  


  const initializePlayer = () => {
    if (!window.YT || !window.YT.Player) {
      console.error("YouTube API not loaded yet.");
      return;
    }
  
    playerRef.current = new window.YT.Player('youtube-player', {
      height: '100',
      width: '100',
      playerVars: {
        autoplay: 1,
        controls: 1,
        enablejsapi: 1, // Ensures API loads faster
        origin: window.location.origin, // Helps avoid cross-origin issues
      },
      events: {
        'onReady': (event) => {
          setIsPlayerReady(true);
          if (currentTrack) {
            event.target.loadVideoById(currentTrack);
          }
        },
        'onStateChange': onPlayerStateChange
      }
    });
    
  };
  

  const onPlayerStateChange = (event) => {
    if (user?.uid === party?.hostId && isPlayerReady) {
      const newState = event.data;
      setPlayerState(newState);
      updateDoc(doc(db, "parties", partyId), {
        playerState: newState,
        playbackTimestamp: serverTimestamp()
      });
    }
  };

  // Player Controls
  const handlePlayPause = () => {
    if (!isPlayerReady || !playerRef.current) return;

    try {
      if (playerState === 1) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (error) {
      console.error('Player control error:', error);
      alert('Error controlling playback. Please try again.');
    }
  };

  const changeTrack = async () => {
    if (user?.uid !== party?.hostId) {
      alert("Only the host can change tracks!");
      return;
    }

    const videoId = getYouTubeVideoId(videoUrl);
    if (!videoId) {
      alert("Invalid YouTube URL! Please provide a valid YouTube link.");
      return;
    }

    try {
      setCurrentTrack(videoId);
      await updateDoc(doc(db, "parties", partyId), {
        currentTrack: videoId,
        playerState: 1,
        playbackTimestamp: serverTimestamp()
      });
      
      if (playerRef.current && isPlayerReady) {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.playVideo();
      }
      setVideoUrl("");
    } catch (error) {
      console.error("Error changing track:", error);
      alert("Failed to change track. Please try again.");
    }
  };

  // Playback Synchronization
  const syncPlayback = useCallback(async (partyData) => {
    if (!playerRef.current || !partyData.currentTrack || !isPlayerReady) return;
    
    const hostTime = partyData.playbackTimestamp?.toDate().getTime();
    const currentTime = Date.now();
    const timeDiff = currentTime - hostTime;

    if (user?.uid !== partyData.hostId) {
      try {
        if (currentTrack !== partyData.currentTrack) {
          await playerRef.current.loadVideoById(partyData.currentTrack);
          setCurrentTrack(partyData.currentTrack);
        }
        
        if (partyData.playerState === 1) {
          const currentTime = await playerRef.current.getCurrentTime();
          const targetTime = currentTime + (timeDiff / 1000);
          await playerRef.current.seekTo(targetTime, true);
          playerRef.current.playVideo();
        } else if (partyData.playerState === 2) {
          playerRef.current.pauseVideo();
        }
      } catch (error) {
        console.error("Playback sync error:", error);
      }
    }
  }, [currentTrack, user?.uid, isPlayerReady]);

  // Party Management
  const createParty = async () => {
    if (!user) return alert("Please log in first!");

    const partyRef = await addDoc(collection(db, "parties"), {
      hostId: user.uid,
      members: [{ uid: user.uid, name: user.displayName || "Unknown" }],
      messages: [],
      currentTrack: null,
      playerState: -1,
      playbackTimestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    });

    setPartyId(partyRef.id);
    setIsChatOpen(true);
  };

  const joinParty = async () => {
    if (!user || !partyId) return alert("Invalid Party ID or User");

    const partyRef = doc(db, "parties", partyId);
    const partySnap = await getDoc(partyRef);
    if (!partySnap.exists()) return alert("Party not found!");

    await updateDoc(partyRef, {
      members: arrayUnion({ uid: user.uid, name: user.displayName || "Unknown" }),
    });

    setIsChatOpen(true);
  };

  const sendMessage = async () => {
    if (!partyId || !message.trim()) return alert("Message cannot be empty!");
  
    const messageData = {
      senderId: user?.uid || "Unknown",
      senderName: user?.displayName || "Unknown",
      text: message,
      timestamp: new Date() // Using JavaScript timestamp instead of serverTimestamp()
    };
  
    try {
      console.log("Sending message:", messageData); // Debugging log
  
      await updateDoc(doc(db, "parties", partyId), {
        messages: arrayUnion(messageData)
      });
  
      console.log("Message sent successfully!");
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error); // Log exact error
      alert("Failed to send message. Error: " + error.message);
    }
  };
  
  // Effects
  useEffect(() => {
    loadYouTubeAPI();
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [loadYouTubeAPI]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!partyId) return;

    const unsubscribe = onSnapshot(doc(db, "parties", partyId), (docSnap) => {
      if (docSnap.exists()) {
        const partyData = docSnap.data();
        setParty(partyData);
        setMessages(partyData.messages || []);
        syncPlayback(partyData);
        
        if (partyData.currentTrack) {
          setCurrentTrack(partyData.currentTrack);
        }
      }
    });

    return () => unsubscribe();
  }, [partyId, syncPlayback]);

  return (
<center className="uiop">    <div className="partychat-container">
      {!isChatOpen ? (
        <div className="partychat-join-screen">
          <h2>🎉 Virtual Party</h2>
          <button onClick={createParty} className="partychat-btn partychat-btn-create">
            Create Party
          </button>
          <div className="partychat-join-section">
            <input
              type="text"
              placeholder="Enter Party ID"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="partychat-input"
            />
            <button onClick={joinParty} className="partychat-btn partychat-btn-join">
              Join Party
            </button>
          </div>
        </div>
      ) : (
        <div className="partychat-chat-container">
          <div className="partychat-chat-header">
            <h2>Party ID: {partyId}</h2>
            <button onClick={() => setIsChatOpen(false)} className="partychat-btn partychat-btn-leave">
              Leave Party
            </button>
          </div>

          <div className="partychat-media-container">
            <div id="youtube-player"></div>
            {!isPlayerReady && <div><l-ring  color="coral"></l-ring> </div>}
            <div className="partychat-media-controls">
              <input
                type="text"
                placeholder="Enter YouTube URL"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="partychat-media-input"
              />
              <button 
                onClick={changeTrack}
                className="partychat-btn partychat-btn-control"
                disabled={!isPlayerReady || user?.uid !== party?.hostId}
              >
                Change Track
              </button>
              <button 
                onClick={handlePlayPause} 
                className="partychat-btn partychat-btn-control"
                disabled={!isPlayerReady || user?.uid !== party?.hostId}
              >
                {playerState === 1 ? '⏸️ Pause' : '▶️ Play'}
              </button>
            </div>
          </div>

          <div className="partychat-chat-messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`partychat-chat-bubble ${
                  msg.senderId === user?.uid ? "partychat-sent" : "partychat-received"
                }`}
              >
                <p className="partychat-chat-sender">{msg.senderName}</p>
                <p className="partychat-chat-text">{msg.text}</p>
                <span className="partychat-chat-time">
                  {msg.timestamp?.toDate().toLocaleTimeString()}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="partychat-chat-input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="partychat-chat-input"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="partychat-btn partychat-btn-send">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
    </center>
  );
};

export default PartyChat;