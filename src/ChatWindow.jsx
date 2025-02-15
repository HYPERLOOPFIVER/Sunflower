import { db, auth } from "./Firebase";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useParams } from "react-router-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { Avatar, Box, Button, Grid, IconButton, Paper, TextField, Typography, Tooltip, Fade, Badge } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import { styled, keyframes } from "@mui/material/styles";
import { useEffect, useState, useCallback } from "react";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#00d9c5" },
    secondary: { main: "#9da9b3" },
    background: { 
      default: "#0a0a0a",
      paper: "#1f1f1f" 
    },
    text: {
      primary: "#f0f4f6",
      secondary: "#9da9b3",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
  },
});

const bubbleEntrance = keyframes`
  0% { transform: translateY(20px) scale(0.9); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
`;

const MessageBubble = styled(Box)(({ theme, iscurrentuser }) => ({
  maxWidth: "75%",
  padding: "14px 18px",
  marginBottom: theme.spacing(2),
  borderRadius: iscurrentuser ? "20px 4px 20px 20px" : "4px 20px 20px 20px",
  background: iscurrentuser 
    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #00b8a9 100%)`
    : theme.palette.background.paper,
  color: iscurrentuser ? theme.palette.common.white : theme.palette.text.primary,
  position: "relative",
  alignSelf: iscurrentuser ? "flex-end" : "flex-start",
  boxShadow: theme.shadows[4],
  animation: `${bubbleEntrance} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)`,
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[6],
  },
}));

const ChatWindow = ({ selectedUser: propSelectedUser }) => {
  const { userId } = useParams();
  const [selectedUser, setSelectedUser] = useState(propSelectedUser || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState(false);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!propSelectedUser && userId) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setSelectedUser({ id: userId, ...userSnap.data() });
        }
      }
    };
    fetchUser();
  }, [userId, propSelectedUser]);

  // Generate chat ID
  useEffect(() => {
    if (selectedUser && auth.currentUser) {
      const generatedChatId =
        auth.currentUser.uid > selectedUser.id
          ? `${auth.currentUser.uid}_${selectedUser.id}`
          : `${selectedUser.id}_${auth.currentUser.uid}`;
      setChatId(generatedChatId);
    }
  }, [selectedUser]);

  // Listen to messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })));
    });
    return () => unsubscribe();
  }, [chatId]);

  // Typing indicator handler
  const handleTyping = useCallback(async (isUserTyping) => {
    if (!auth.currentUser || !selectedUser) return;
    
    const userRef = doc(db, "users", auth.currentUser.uid);
    await updateDoc(userRef, {
      typing: isUserTyping ? selectedUser.id : false,
      lastTyping: serverTimestamp()
    });
  }, [selectedUser]);

  // Online status setup
  useEffect(() => {
    if (!selectedUser) return;
    
    const rtdb = getDatabase();
    const presenceRef = ref(rtdb, `presence/${selectedUser.id}`);
    
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const data = snapshot.val();
      setOnlineStatus(data?.status === "online");
    });

    return () => {
      off(presenceRef, "value", unsubscribe);
      setOnlineStatus(false);
    };
  }, [selectedUser]);

  // Typing indicator listener
  useEffect(() => {
    if (!selectedUser) return;
    
    const userRef = doc(db, "users", selectedUser.id);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      const data = doc.data();
      setIsTyping(data?.typing === auth.currentUser?.uid);
    });

    return () => unsubscribe();
  }, [selectedUser]);

  // Message input handler
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (!typingTimeout) {
      handleTyping(true);
    }
    
    clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => handleTyping(false), 1500)
    );
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !auth.currentUser || !chatId) return;
    
    await addDoc(collection(db, "messages"), {
      chatId,
      senderId: auth.currentUser.uid,
      receiverId: selectedUser.id,
      content: newMessage,
      type: "text",
      timestamp: serverTimestamp(),
      seen: false,
    });
    setNewMessage("");
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(45deg, #0a0a0a 0%, #1a1a1a 100%)",
        position: "relative",
      }}>
        {/* Header */}
        <Box sx={{
          p: 2,
          bgcolor: "rgba(31, 31, 31, 0.8)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            color="success"
            sx={{ 
              "& .MuiBadge-dot": {
                width: 14,
                height: 14,
                border: "2px solid #1f1f1f",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }
            }}
          >
            <Avatar 
              src={selectedUser?.photoURL} 
              sx={{ 
                width: 48, 
                height: 48, 
                boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                border: "2px solid rgba(255,255,255,0.1)"
              }}
            />
          </Badge>
          <Box sx={{ ml: 2.5, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {selectedUser?.name}
              {isTyping && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ marginLeft: 12 }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    typing...
                  </Typography>
                </motion.span>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <Box component="span" sx={{
                width: 10,
                height: 10,
                bgcolor: onlineStatus ? "success.main" : "error.main",
                borderRadius: "50%",
                mr: 1.2,
                boxShadow: `0 0 8px ${onlineStatus ? "#00d9c5" : "#ff5252"}`
              }} />
              {onlineStatus ? "Online" : "Offline"}
            </Typography>
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          "&::-webkit-scrollbar": {
            width: "10px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#3d3d3d",
            borderRadius: "6px",
            border: "2px solid #0a0a0a",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#0a0a0a",
          },
        }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: msg.senderId === auth.currentUser?.uid ? 100 : -100 }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
              >
                <MessageBubble iscurrentuser={msg.senderId === auth.currentUser?.uid ? 1 : 0}>
                  <Typography variant="body2" sx={{ 
                    wordBreak: "break-word", 
                    lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </Typography>
                  <Box sx={{ 
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 1,
                  }}>
                    {msg.senderId === auth.currentUser?.uid && (
                      <Typography variant="caption" sx={{ 
                        color: "rgba(255,255,255,0.7)",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.7rem",
                      }}>
                        {msg.seen ? "✓✓" : "✓"}
                      </Typography>
                    )}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: msg.senderId === auth.currentUser?.uid ? "rgba(255,255,255,0.7)" : "text.secondary",
                        fontSize: "0.75rem",
                      }}
                    >
                      {msg.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                </MessageBubble>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>

        {/* Input Area */}
        <Box sx={{
          p: 2,
          bgcolor: "rgba(31, 31, 31, 0.8)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        }}>
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1.5,
            position: "relative",
          }}>
            <IconButton
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              sx={{ 
                color: "text.secondary",
                bgcolor: "rgba(255,255,255,0.05)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }
              }}
            >
              <EmojiEmotionsIcon fontSize="small" />
            </IconButton>

            {showEmojiPicker && (
              <Box sx={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                mb: 2,
                zIndex: 1,
              }}>
                <Picker
                  data={data}
                  onEmojiSelect={(emoji) => setNewMessage(newMessage + emoji.native)}
                  theme="dark"
                  previewPosition="none"
                />
              </Box>
            )}

            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              multiline
              maxRows={4}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 28,
                  bgcolor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.2)",
                  },
                  "&.Mui-focused": {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />

            <IconButton
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              sx={{
                bgcolor: "primary.main",
                color: "common.white",
                "&:hover": { 
                  bgcolor: "primary.dark",
                  transform: "scale(1.1)",
                },
                "&:disabled": { 
                  bgcolor: "rgba(255,255,255,0.05)",
                  color: "text.secondary",
                },
                transition: "all 0.2s ease",
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default ChatWindow;