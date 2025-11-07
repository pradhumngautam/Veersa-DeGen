import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './VideoCall.css';

export default function VideoCall({ appointmentId, userRole, onEnd }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, connecting, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  // ICE servers configuration (using free STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    initializeCall();
    
    // Subscribe to signaling messages
    const channel = supabase
      .channel(`video-call-${appointmentId}`)
      .on('broadcast', { event: 'signal' }, handleSignal)
      .subscribe();

    return () => {
      cleanup();
      channel.unsubscribe();
    };
  }, [appointmentId]);

  const initializeCall = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;
      setPeerConnection(pc);

      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setCallStatus('connected');
        toast.success('Call connected!');
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          toast.error('Call disconnected');
          setCallStatus('ended');
        }
      };

      // If doctor, wait for offer. If patient, create offer
      if (userRole === 'patient') {
        createOffer(pc);
      } else {
        setCallStatus('connecting');
      }

    } catch (error) {
      console.error('Error initializing call:', error);
      toast.error('Failed to access camera/microphone');
      setCallStatus('ended');
    }
  };

  const createOffer = async (pc) => {
    try {
      setCallStatus('connecting');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendSignal({
        type: 'offer',
        offer: offer
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      toast.error('Failed to start call');
    }
  };

  const handleSignal = async ({ payload }) => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      if (payload.type === 'offer' && userRole === 'doctor') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        sendSignal({
          type: 'answer',
          answer: answer
        });
        setCallStatus('connected');
      } else if (payload.type === 'answer' && userRole === 'patient') {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        setCallStatus('connected');
      } else if (payload.type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  };

  const sendSignal = async (data) => {
    try {
      await supabase.channel(`video-call-${appointmentId}`)
        .send({
          type: 'broadcast',
          event: 'signal',
          payload: data
        });
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    cleanup();
    setCallStatus('ended');
    toast.success('Call ended');
    if (onEnd) onEnd();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnection(null);
  };

  if (callStatus === 'ended') {
    return (
      <div className="video-call-ended">
        <h3>Call Ended</h3>
        <button onClick={onEnd} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>Video Consultation</h3>
        <span className={`call-status status-${callStatus}`}>
          {callStatus === 'initializing' && 'Initializing...'}
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && '🟢 Connected'}
        </span>
      </div>

      <div className="video-grid">
        <div className="video-container remote-video">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
          {!remoteStream && (
            <div className="waiting-message">
              Waiting for other participant...
            </div>
          )}
        </div>

        <div className="video-container local-video">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element"
          />
          {isVideoOff && (
            <div className="video-off-overlay">
              Camera Off
            </div>
          )}
        </div>
      </div>

      <div className="video-controls">
        <button
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'active' : ''}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoOff ? '📹❌' : '📹'}
        </button>

        <button
          onClick={endCall}
          className="control-btn end-call-btn"
          title="End call"
        >
          📞 End Call
        </button>
      </div>
    </div>
  );
}