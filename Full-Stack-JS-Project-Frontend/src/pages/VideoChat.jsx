import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VideoChat = ({ userId, roomCode, onClose }) => {
  const [jitsiRoom, setJitsiRoom] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    const fetchJitsiRoom = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/generate-jitsi-room?roomCode=${roomCode}`);
        setJitsiRoom(response.data.jitsiRoom);
        setRoomPassword(response.data.roomPassword);
      } catch (err) {
        console.error('Error fetching Jitsi room:', err);
        // Fallback to a default room name if the API call fails
        setJitsiRoom(`MoodwaveChat_${roomCode}`);
        setRoomPassword('securepassword'); // Fallback password
      }
    };
    fetchJitsiRoom();
  }, [roomCode]);

  if (!jitsiRoom) {
    return <div>Loading video call...</div>;
  }

  const jitsiDomain = 'meet.jit.si'; // Public Jitsi Meet server
  const jitsiUrl = `https://${jitsiDomain}/${jitsiRoom}?userInfo.displayName=${encodeURIComponent(userId)}${
    roomPassword ? `#config.roomPassword=${roomPassword}` : ''
  }`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Embed Jitsi Meet via iframe */}
      <iframe
        src={jitsiUrl}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="camera; microphone; fullscreen; display-capture"
        title="Jitsi Meet Video Call"
      ></iframe>

      {/* Controls */}
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default VideoChat;