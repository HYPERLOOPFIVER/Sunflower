import { useState, useEffect, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  IconButton, 
  Typography, 
  Stack, 
  LinearProgress,
  Avatar,
  Box
} from "@mui/material";
import { 
  Videocam, 
  VideocamOff, 
  Mic, 
  MicOff, 
  CallEnd, 
  Phone, 
  PhoneDisabled 
} from "@mui/icons-material";
import { db, auth } from "./Firebase";
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from "firebase/firestore";

const Call = ({ selectedUser, currentUser }) => {
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Firebase configuration
  const callDocRef = doc(db, "calls", selectedUser.id);
  const currentUserRef = doc(db, "users", auth.currentUser.uid);

  // WebRTC Configuration
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      // Add your TURN servers here if needed
    ]
  };

  // Initialize peer connection
  const createPeerConnection = async () => {
    peerConnection.current = new RTCPeerConnection(iceServers);

    // Add local stream to connection
    localStream.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream);
    });

    // Remote stream handling
    peerConnection.current.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // ICE Candidate handling
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(callDocRef, {
          iceCandidates: [...(call?.iceCandidates || []), event.candidate.toJSON()]
        });
      }
    };
  };

  // Handle incoming calls
  useEffect(() => {
    const unsubscribe = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;

      setCall(data);
      
      if (data.type === 'offer' && !peerConnection.current) {
        handleIncomingCall(data);
      } else if (data.type === 'answer' && peerConnection.current?.signalingState === 'have-local-offer') {
        handleAnswer(data);
      } else if (data.iceCandidates) {
        handleIceCandidates(data.iceCandidates);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleIncomingCall = async (offer) => {
    try {
      await setupLocalMedia();
      await createPeerConnection();
      
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      await setDoc(callDocRef, {
        type: 'answer',
        answer: answer,
        callerId: offer.callerId,
        receiverId: auth.currentUser.uid,
        status: 'ongoing'
      });
    } catch (error) {
      console.error("Error handling incoming call:", error);
      endCall();
    }
  };

  const handleAnswer = async (answer) => {
    try {
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      updateDoc(callDocRef, { status: 'ongoing' });
    } catch (error) {
      console.error("Error handling answer:", error);
      endCall();
    }
  };

  const handleIceCandidates = async (candidates) => {
    try {
      for (const candidate of candidates) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  };

  // Media setup
  const setupLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call?.type === 'video',
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      endCall();
    }
  };

  // Initiate call
  const startCall = async (callType) => {
    try {
      await setupLocalMedia();
      await createPeerConnection();
      
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      
      await setDoc(callDocRef, {
        type: callType,
        offer: offer,
        callerId: auth.currentUser.uid,
        receiverId: selectedUser.id,
        status: 'calling',
        iceCandidates: []
      });
    } catch (error) {
      console.error("Error starting call:", error);
      endCall();
    }
  };

  // End call cleanup
  const endCall = async () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setCall(null);
    await setDoc(callDocRef, { status: 'ended' }, { merge: true });
  };

  // Toggle media controls
  const toggleAudio = () => {
    setIsMuted(!isMuted);
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
  };

  return (
    <>
      {/* Call Initiation Buttons (Add to ChatWindow) */}
      <IconButton onClick={() => startCall('video')}>
        <Videocam fontSize="small" />
      </IconButton>
      <IconButton onClick={() => startCall('audio')}>
        <Phone fontSize="small" />
      </IconButton>

      {/* Call Interface */}
      <Dialog 
        open={!!call} 
        fullScreen 
        PaperProps={{ sx: { bgcolor: 'background.default' } }}
      >
        <DialogContent sx={{ position: 'relative', height: '100%' }}>
          {/* Remote Video */}
          {remoteStream && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 8
              }}
            />
          )}

          {/* Local Video Preview */}
          {localStream && call?.type === 'video' && (
            <Box sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 150,
              height: 200,
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 3
            }}>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </Box>
          )}

          {/* Call Controls */}
          <Stack 
            direction="row" 
            spacing={3} 
            sx={{
              position: 'absolute',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              p: 1.5,
              borderRadius: 4
            }}
          >
            <IconButton 
              onClick={toggleAudio}
              sx={{ bgcolor: 'background.paper' }}
            >
              {isMuted ? <MicOff color="error" /> : <Mic />}
            </IconButton>
            
            {call?.type === 'video' && (
              <IconButton 
                onClick={toggleVideo}
                sx={{ bgcolor: 'background.paper' }}
              >
                {isVideoOn ? <Videocam /> : <VideocamOff color="error" />}
              </IconButton>
            )}

            <IconButton 
              onClick={endCall}
              sx={{ bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
            >
              <CallEnd />
            </IconButton>
          </Stack>

          {/* Call Status */}
          <Box sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar 
              src={selectedUser?.photoURL} 
              sx={{ width: 56, height: 56 }}
            />
            <Box>
              <Typography variant="h6">
                {selectedUser?.name || selectedUser?.email}
              </Typography>
              <Typography variant="body2">
                {call?.status === 'calling' ? 'Calling...' : 
                 call?.status === 'ongoing' ? 'Connected' : 
                 'Ending call...'}
              </Typography>
              {call?.status === 'calling' && (
                <LinearProgress sx={{ width: 100, mt: 1 }} />
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Call;