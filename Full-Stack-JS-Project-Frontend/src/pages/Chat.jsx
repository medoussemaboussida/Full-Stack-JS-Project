import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt-token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded = JSON.parse(atob(storedToken.split('.')[1]));
        setUserId(decoded.id);
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token format');
      }
    } else {
      setError('Please log in first');
    }
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
    if (!newMessage.trim() || !joinedRoom || !token || !userId) return;

    try {
      await axios.post(
        'http://localhost:5000/users/chat',
        { roomCode: joinedRoom, userId, message: newMessage },
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
    <>
      <style>
        {`
          .chat-container {
            max-width: 800px;
            margin: 40px auto 300px; /* Increased bottom margin to 100px to create more space */
            padding: 20px;
            background-color: #fff;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }

          h2 {
            font-size: 1.8rem;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 600;
          }

          .join-container {
            text-align: center;
            padding: 30px; /* Increased padding for more internal space */
            background-color: #ecf0f1;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }

          .join-container input[type="text"] {
            width: 60%;
            max-width: 300px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1rem;
            margin-right: 10px;
            box-sizing: border-box;
            transition: border-color 0.3s ease;
          }

          .join-container input[type="text"]:focus {
            border-color: #3498db;
            outline: none;
          }

          .join-container button {
            padding: 12px 20px;
            background-color: #3498db;
            border: none;
            border-radius: 5px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            transition: background-color 0.3s ease;
          }

          .join-container button:hover {
            background-color: #2980b9;
          }

          .join-container button:disabled {
            background-color: #bdc3c7;
            cursor: not-allowed;
          }

          .error {
            color: #e74c3c;
            font-size: 0.9rem;
            margin-top: 10px;
            text-align: center;
          }

          .message-container {
            margin-top: 20px;
            height: 300px;
            overflow-y: auto;
            padding: 10px;
            border-top: 1px solid #ddd;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .message {
            background-color: #ecf0f1;
            border-radius: 8px;
            padding: 10px;
            margin: 5px 0;
            max-width: 80%;
            word-wrap: break-word;
            align-self: flex-start;
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }

          .message.self {
            background-color: #3498db;
            color: white;
            align-self: flex-end;
          }

          .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            flex-shrink: 0;
          }

          .no-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background-color: #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 14px;
            flex-shrink: 0;
          }

          .message-content {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
          }

          .username {
            font-weight: bold;
            font-size: 1rem;
            margin-bottom: 5px;
          }

          .message-text {
            font-size: 0.9rem;
            word-wrap: break-word;
          }

          .timestamp {
            font-size: 0.8rem;
            color: #333;
            margin-top: 5px;
            text-align: right;
          }

          .message.self .timestamp {
            color: #fff;
          }

          .input-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .message-input {
            width: 80%;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ddd;
            margin-right: 10px;
            font-size: 1rem;
          }

          .refresh-button, .leave-button, .send-button {
            padding: 10px 15px;
            border: none;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            transition: background-color 0.2s;
          }

          .send-button {
            background-color: #2ecc71;
          }

          .send-button:hover {
            background-color: #27ae60;
          }

          .refresh-button {
            background-color: #f39c12;
          }

          .refresh-button:hover {
            background-color: #e67e22;
          }

          .leave-button {
            background-color: #e74c3c;
          }

          .leave-button:hover {
            background-color: #c0392b;
          }
        `}
      </style>

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
            />
            <button onClick={joinRoom} disabled={!roomCode.trim()}>
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
                    {msg.sender.user_photo ? (
                      <img
                        src={`http://localhost:5000${msg.sender.user_photo}`}
                        alt={msg.sender.username || 'User'}
                        className="avatar"
                      />
                    ) : (
                      <div className="no-avatar">
                        {msg.sender.username ? msg.sender.username[0] : 'U'}
                      </div>
                    )}
                    <div className="message-content">
                      <span className="username">{msg.sender.username || 'Unknown'}</span>
                      <span className="message-text">{msg.message}</span>
                      <small className="timestamp">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </small>
                    </div>
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
    </>
  );
};

export default Chat;