import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);

  // Fetch userId and token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('jwt-token');
    if (storedToken) {
      setToken(storedToken);
      // Decode token to get userId (assuming token contains id)
      try {
        const decoded = JSON.parse(atob(storedToken.split('.')[1])); // Decode JWT payload
        setUserId(decoded.id);
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token format');
      }
    } else {
      setError('Please log in first');
    }
    console.log('Initial State:', { userId, token });
  }, []);

  const fetchMessages = async () => {
    if (!joinedRoom || !token) return;

    try {
      const response = await axios.get(`http://localhost:5000/users/chat/${joinedRoom}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMessages(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err.response?.data || err.message);
      setError('Failed to load messages: ' + (err.response?.data?.message || err.message));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !joinedRoom || !token || !userId) return; // Add !userId check
  
    try {
      const response = await axios.post(
        'http://localhost:5000/users/chat',
        { roomCode: joinedRoom, userId, message: newMessage }, // Add userId
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err.response?.data || err.message);
      setError('Failed to send message: ' + (err.response?.data?.message || err.message));
    }
  };

  const joinRoom = () => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    if (!token) {
      setError('Please log in first');
      return;
    }
    setJoinedRoom(roomCode);
    setMessages([]);
    setError(null);
  };

  useEffect(() => {
    if (joinedRoom) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [joinedRoom]);

  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const handleRoomKeyPress = (e) => {
    if (e.key === 'Enter') joinRoom();
  };

  // If not logged in, show a login prompt
  if (!token) {
    return (
      <div className="chat-container">
        <h2>Please Log In</h2>
        <p>You need to log in to use the chat. <a href="/login">Go to Login</a></p>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="chat-container">
      {!joinedRoom ? (
        <div className="join-container">
          <h2>Join a Chat Room</h2>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyPress={handleRoomKeyPress}
            placeholder="Enter room code..."
            className="room-input"
          />
          <button onClick={joinRoom} className="join-button">
            Join
          </button>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <>
          <h2>Chat Room: {joinedRoom}</h2>
          <div className="message-container">
            {error && <p className="error">{error}</p>}
            {messages.length === 0 ? (
              <p>No messages yet</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`message ${msg.sender._id === userId ? 'self' : ''}`}
                >
                  <strong>{msg.sender.username || msg.sender}: </strong>
                  {msg.message}
                  <small className="timestamp">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </small>
                </div>
              ))
            )}
          </div>
          <div className="input-container">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleMessageKeyPress}
              placeholder="Type a message..."
              className="message-input"
            />
            <button onClick={sendMessage} className="send-button">
              Send
            </button>
            <button onClick={fetchMessages} className="refresh-button">
              Refresh
            </button>
            <button onClick={() => setJoinedRoom(null)} className="leave-button">
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;