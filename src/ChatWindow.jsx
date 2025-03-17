import { db, auth } from "./Firebase";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc 
} from "firebase/firestore";
import CallIcon from "@mui/icons-material/Call";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useParams } from "react-router-dom";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";
import { 
  Avatar, 
  Box, 
  IconButton, 
  TextField, 
  Typography, 
  Badge, 
  Stack, 
  Dialog, 
  DialogContent,
  Menu,
  MenuItem,
  LinearProgress
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Call from "./Call";
// Cloudinary Configuration
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';
const CLOUDINARY_CLOUD_NAME = 'dfzmg1jtd';

// Minimalist Premium Theme Configuration
const premiumTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { 
      main: "#5A4FCF",     // Deep Indigo
      light: "#7E6FEA",    // Soft Lavender
      dark: "#3A2E8B"      // Dark Indigo
    },
    background: { 
      default: "#121212",  // Ultra-Dark Background
      paper: "#1A1A2E"     // Slightly Lighter Panel
    },
    text: {
      primary: "#E2E8F0",  // Soft Slate White
      secondary: "#A0AEC0" // Muted Gray
    },
    divider: "rgba(255,255,255,0.12)"
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 15,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.02em'
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6
    }
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.05)',
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)'
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 2px ${alpha('#5A4FCF', 0.3)}`
            }
          }
        }
      }
    }
  }
});

const ChatWindow = ({ selectedUser: propSelectedUser }) => {
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null);

  const { userId } = useParams();
  const [selectedUser, setSelectedUser] = useState(propSelectedUser || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Media sharing states
  const [mediaType, setMediaType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const audioTimerRef = useRef(null);

  // Message deletion states
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!propSelectedUser && userId) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setSelectedUser({ id: userId, ...userSnap.data() });
          setUserDetails(userSnap.data());
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

  // Media upload handler
  const handleMediaUpload = async () => {
    if (!selectedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, 
        formData
      );

      if (!auth.currentUser || !selectedUser || !chatId) return;
      
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: auth.currentUser.uid,
        receiverId: selectedUser.id,
        content: response.data.secure_url,
        type: mediaType, // 'image' or 'video'
        timestamp: serverTimestamp(),
        seen: false,
        replyTo: replyingTo?.id || null,
      });

      setSelectedFile(null);
      setPreviewUrl(null);
      setMediaType(null);
    } catch (error) {
      console.error("Media upload error:", error);
    }
  };

  // File selection handler
  const handleFileSelect = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMediaType(type);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const initiateVideoCall = () => {
    setCallType('video');
    setShowCallModal(true);
  };

  const initiateAudioCall = () => {
    setCallType('audio');
    setShowCallModal(true);
  };

  // Audio recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      // Reset audio chunks
      const chunks = [];
      setAudioChunks(chunks);
      
      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
        setAudioChunks(prevChunks => [...prevChunks, e.data]);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioPreviewUrl(audioUrl);
        setRecordingDuration(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);

      // Start timer
      let duration = 0;
      audioTimerRef.current = setInterval(() => {
        duration += 1;
        setRecordingDuration(duration);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // Clear timer
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }
    }
  };

  const sendAudioMessage = async () => {
    if (!audioBlob) return;
  
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
  
      console.log('Uploading audio with FormData:', formData);
  
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
  
      console.log('Cloudinary upload response:', response.data);
  
      if (!auth.currentUser || !selectedUser || !chatId) {
        console.error('Missing required data', { 
          currentUser: !!auth.currentUser, 
          selectedUser: !!selectedUser, 
          chatId: !!chatId 
        });
        return;
      }
  
      const messageRef = await addDoc(collection(db, "messages"), {
        chatId,
        senderId: auth.currentUser.uid,
        receiverId: selectedUser.id,
        content: response.data.secure_url,
        type: "audio",
        timestamp: serverTimestamp(),
        seen: false,
        duration: recordingDuration,
        replyTo: replyingTo?.id || null,
      });
  
      console.log('Message added with ID:', messageRef.id);
  
      // Reset audio states
      setAudioBlob(null);
      setAudioPreviewUrl(null);
      setRecordingDuration(0);
      setReplyingTo(null);
    } catch (error) {
      console.error("Full error uploading audio:", error);
      console.error("Error response:", error.response?.data);
    }
  };

  const cancelAudioMessage = () => {
    // Reset all audio-related states
    setAudioBlob(null);
    setAudioPreviewUrl(null);
    setRecordingDuration(0);
    setIsRecording(false);
    
    // Clear timer
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
    }
  };

  // Message deletion handler
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;

    try {
      await deleteDoc(doc(db, "messages", selectedMessage.id));
      setAnchorEl(null);
      setSelectedMessage(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

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
      replyTo: replyingTo?.id || null,
    });
    setNewMessage("");
    setReplyingTo(null);
  };

  // Get display name
  const getDisplayName = () => {
    if (!selectedUser) return "Unknown User";
    return selectedUser.name || selectedUser.idkNumber || "Unknown User";
  };

  // Handle reply click
  const handleReplyClick = (message) => {
    setReplyingTo(message);
  };

  // Media type selection modal
  const MediaTypeSelector = () => (
    <Dialog 
      open={!!mediaType} 
      onClose={() => {
        setMediaType(null);
        setSelectedFile(null);
        setPreviewUrl(null);
      }}
    >
      <DialogContent sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 2,
        background: premiumTheme.palette.background.paper
      }}>
        {previewUrl && (
          <Box sx={{ 
            maxWidth: 300, 
            maxHeight: 300, 
            overflow: 'hidden', 
            borderRadius: 2 
          }}>
            {mediaType === 'image' ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }} 
              />
            ) : (
              <video 
                src={previewUrl} 
                controls 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }}
              />
            )}
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <IconButton 
              onClick={handleMediaUpload}
              sx={{ 
                background: premiumTheme.palette.primary.main,
                color: '#fff',
                '&:hover': { background: alpha(premiumTheme.palette.primary.main, 0.9) }
              }}
            >
              <SendIcon />
            </IconButton>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <IconButton 
              onClick={() => {
                setMediaType(null);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              sx={{ 
                background: premiumTheme.palette.error.main,
                color: '#fff',
                '&:hover': { background: alpha(premiumTheme.palette.error.main, 0.9) }
              }}
            >
              <CloseIcon />
            </IconButton>
          </motion.div>
        </Box>
      </DialogContent>
    </Dialog>
  );

  // Audio preview component
  const AudioPreview = () => (
    <Box sx={{
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      p: 1,
      background: alpha(premiumTheme.palette.primary.main, 0.1),
      borderRadius: 2
    }}>
      <audio 
        controls 
        src={audioPreviewUrl} 
        style={{ width: '100%', maxWidth: 300 }} 
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton 
          onClick={sendAudioMessage}
          sx={{
            background: premiumTheme.palette.primary.main,
            color: '#fff',
            '&:hover': { background: alpha(premiumTheme.palette.primary.main, 0.9) }
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
        <IconButton 
          onClick={cancelAudioMessage}
          sx={{
            background: premiumTheme.palette.error.main,
            color: '#fff',
            '&:hover': { background: alpha(premiumTheme.palette.error.main, 0.9) }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );

  // Recording UI Component
  const RecordingUI = () => (
    <Box sx={{
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      p: 1,
      background: alpha(premiumTheme.palette.error.main, 0.1),
      borderRadius: 2
    }}>
      <Box sx={{ flex: 1 }}>
        <Typography 
          variant="body2" 
          color="error" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}
        >
          <Box sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: premiumTheme.palette.error.main,
            animation: 'pulse 1s infinite'
          }} />
          Recording: {recordingDuration}s
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={(recordingDuration / 60) * 100} 
          color="error"
          sx={{ mt: 1 }}
        />
      </Box>
      <IconButton 
        onClick={stopRecording}
        sx={{
          background: premiumTheme.palette.error.main,
          color: '#fff',
          '&:hover': { background: alpha(premiumTheme.palette.error.main, 0.9) }
        }}
      >
        <StopIcon fontSize="small" />
      </IconButton>
    </Box>
  );

  // Minimalist Message Bubble Component
  const MessageBubble = ({ msg, isCurrentUser }) => {
    const messageStyle = {
      maxWidth: '75%',
      minWidth: '120px',
      padding: '12px 16px',
      borderRadius: '16px',
      background: isCurrentUser 
        ? alpha(premiumTheme.palette.primary.main, 0.2)
        : 'rgba(255,255,255,0.05)',
      color: premiumTheme.palette.text.primary,
      boxShadow: 'none',
      border: `1px solid ${isCurrentUser 
        ? alpha(premiumTheme.palette.primary.main, 0.3)
        : 'rgba(255,255,255,0.1)'}`,
      position: 'relative',
      transition: 'all 0.2s ease'
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Box sx={messageStyle}>
          {msg.replyTo && (
            <Box sx={{
              borderLeft: `3px solid ${alpha(premiumTheme.palette.primary.main, 0.6)}`,
              pl: 1.5,
              mb: 1,
              color: premiumTheme.palette.text.secondary,
              fontSize: '0.8rem'
            }}>
              {messages.find(m => m.id === msg.replyTo)?.content || "Original message"}
            </Box>
          )}
          {msg.type === 'text' ? (
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {msg.content}
            </Typography>
          ) : msg.type === 'image' ? (
            <Box sx={{ 
              width: '100%', 
              maxWidth: 300, 
              borderRadius: 2, 
              overflow: 'hidden' 
            }}>
              <img 
                src={msg.content} 
                alt="Shared media" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  borderRadius: 8
                }} 
              />
            </Box>
          ) : msg.type === 'video' ? (
            <Box sx={{ 
              width: '100%', 
              maxWidth: 300, 
              borderRadius: 2, 
              overflow: 'hidden' 
            }}>
              <video 
                src={msg.content} 
                controls 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain',
                  borderRadius: 8
                }}
              />
            </Box>
          ) : msg.type === 'audio' ? (
            <Box sx={{ 
              width: '100%', 
              maxWidth: 300, 
              borderRadius: 2, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              <audio 
                controls 
                src={msg.content} 
                style={{ 
                  width: '100%', 
                  maxWidth: 300,
                  borderRadius: 8 
                }}
              />
              {msg.duration && (
                <Typography variant="caption" sx={{ 
                  color: premiumTheme.palette.text.secondary,
                  textAlign: 'center'
                }}>
                  Duration: {msg.duration}s
                </Typography>
              )}
            </Box>
          ) : null}
          
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center" 
            sx={{ mt: 1, opacity: 0.7 }}
          >
            <Typography variant="caption" sx={{ 
              fontSize: '0.7rem',
              color: premiumTheme.palette.text.secondary
            }}>
              {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {isCurrentUser && (
              <Typography variant="caption" sx={{ 
                fontSize: '0.7rem',
                color: premiumTheme.palette.text.secondary
              }}>
                {msg.seen ? '✓✓' : '✓'}
              </Typography>
            )}
          </Stack>
          {isCurrentUser && (
            <Box sx={{ position: 'absolute', right: -8, bottom: -8 }}>
              <IconButton
                size="small"
                onClick={() => handleReplyClick(msg)}
                sx={{
                  background: premiumTheme.palette.background.paper,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  mr: 1,
                  '&:hover': {
                    background: alpha(premiumTheme.palette.background.paper, 0.9)
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                  Reply
                </Typography>
              </IconButton>
              
              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedMessage(msg);
                }}
                sx={{
                  background: premiumTheme.palette.background.paper,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    background: alpha(premiumTheme.palette.background.paper, 0.9)
                  }
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
      </motion.div>
    );
  };
  return (
    
      <ThemeProvider theme={premiumTheme}>
        <Box sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: premiumTheme.palette.background.default
        }}>
          {/* Hidden file inputs */}
          <input 
            type="file" 
            ref={fileInputRef}
            accept={mediaType === 'image' ? 'image/*' : 'video/*'}
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e, mediaType)}
          />
    
          {/* Media Type Selection Modal */}
          <MediaTypeSelector />
    
          {/* Message Options Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => {
              setAnchorEl(null);
              setSelectedMessage(null);
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem 
              onClick={handleDeleteMessage}
              sx={{ 
                color: premiumTheme.palette.error.main,
                '&:hover': { 
                  background: alpha(premiumTheme.palette.error.main, 0.1) 
                }
              }}
            >
              Delete Message
            </MenuItem>
          </Menu>
       {/* Call Component */}
       {showCallModal && selectedUser && (
          <Call 
            selectedUser={selectedUser}
            currentUser={auth.currentUser}
            callType={callType}
            onClose={() => setShowCallModal(false)}
          />
        )}

        {/* Header */}
        <Box sx={{
          p: 2,
          borderBottom: `1px solid ${premiumTheme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              color={onlineStatus ? 'success' : 'error'}
            >
              <Avatar 
                src={selectedUser?.photoURL} 
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: `2px solid ${alpha(premiumTheme.palette.primary.main, 0.5)}`
                }}
              />
            </Badge>
            <Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                fontSize: '1rem' 
              }}>
                {getDisplayName()}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: onlineStatus ? premiumTheme.palette.success.main : premiumTheme.palette.text.secondary,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}>
                <Box component="span" sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: onlineStatus ? premiumTheme.palette.success.main : premiumTheme.palette.text.secondary
                }} />
                {onlineStatus ? 'Online' : 'Offline'}
                {isTyping && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    • typing...
                  </Typography>
                )}
              </Typography>
            </Box>
          </Box>

          {/* Call Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={initiateAudioCall}
              sx={{
                color: premiumTheme.palette.text.secondary,
                '&:hover': { color: premiumTheme.palette.primary.main }
              }}
            >
              <CallIcon />
            </IconButton>
            <IconButton
              onClick={initiateVideoCall}
              sx={{
                color: premiumTheme.palette.text.secondary,
                '&:hover': { color: premiumTheme.palette.primary.main }
              }}
            >
              <VideocamIcon />
            </IconButton>
          </Box>
        </Box>

                
            
          {/* Messages Container */}
          <Box sx={{
            flex: 1,
            p: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5
          }}>
            <AnimatePresence>
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    alignSelf: msg.senderId === auth.currentUser?.uid ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <MessageBubble 
                    msg={msg} 
                    isCurrentUser={msg.senderId === auth.currentUser?.uid} 
                  />
                </Box>
              ))}
            </AnimatePresence>
          </Box>
    
          {/* Input Area */}
          <Box sx={{
            p: 2,
            borderTop: `1px solid ${premiumTheme.palette.divider}`
          }}>
            {/* Audio recording preview or active recording UI */}
            {audioPreviewUrl ? (
              <AudioPreview />
            ) : isRecording ? (
              <RecordingUI />
            ) : null}
    
            {replyingTo && (
              <Box sx={{
                mb: 1,
                p: 1,
                borderRadius: '8px',
                background: alpha(premiumTheme.palette.primary.main, 0.1),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Typography variant="caption" sx={{ 
                  color: premiumTheme.palette.primary.main,
                  fontSize: '0.8rem'
                }}>
                  Replying to: {replyingTo.content}
                </Typography>
                <IconButton size="small" onClick={() => setReplyingTo(null)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                sx={{
                  color: premiumTheme.palette.text.secondary,
                  '&:hover': { color: premiumTheme.palette.primary.main }
                }}
              >
                <EmojiEmotionsIcon fontSize="small" />
              </IconButton>
    
              {showEmojiPicker && (
                <Box sx={{ 
                  position: 'absolute',
                  bottom: 80,
                  zIndex: 10 
                }}>
                  <Picker
                    data={data}
                    onEmojiSelect={(emoji) => setNewMessage(newMessage + emoji.native)}
                    theme="dark"
                    previewPosition="none"
                  />
                </Box>
              )}
    
              {/* Media selection buttons */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton
                  onClick={() => {
                    setMediaType('image');
                    fileInputRef.current.click();
                  }}
                  sx={{
                    color: premiumTheme.palette.text.secondary,
                    '&:hover': { color: premiumTheme.palette.primary.main }
                  }}
                >
                  <ImageIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={() => {
                    setMediaType('video');
                    fileInputRef.current.click();
                  }}
                  sx={{
                    color: premiumTheme.palette.text.secondary,
                    '&:hover': { color: premiumTheme.palette.primary.main }
                  }}
                >
                  <VideoLibraryIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={isRecording ? stopRecording : startRecording}
                  sx={{
                    color: isRecording ? premiumTheme.palette.error.main : premiumTheme.palette.text.secondary,
                    '&:hover': { color: isRecording ? premiumTheme.palette.error.dark : premiumTheme.palette.primary.main }
                  }}
                >
                  {isRecording ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                </IconButton>
              </Box>
    
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputChange}
                multiline
                maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    '& fieldset': { borderColor: premiumTheme.palette.divider },
                  }
                }}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
    
              <IconButton
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                sx={{
                  background: premiumTheme.palette.primary.main,
                  color: '#fff',
                  '&:hover': { background: alpha(premiumTheme.palette.primary.main, 0.9) },
                  '&:disabled': { background: 'rgba(255,255,255,0.12)' }
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