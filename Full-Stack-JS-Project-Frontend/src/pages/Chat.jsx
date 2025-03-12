import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css'; // Ensure Bootstrap is imported
import EmojiPicker from 'emoji-picker-react'; // Import emoji picker

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility

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
        headers: { Authorization: `Bearer ${token}` },
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
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setNewMessage('');
      fetchMessages();
      setShowEmojiPicker(false); // Hide picker after sending
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

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  if (!token) {
    return (
      <section>
        <div className="container py-5">
          <div className="row d-flex justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-6">
              <div className="card" id="chat2">
                <div className="card-header d-flex justify-content-between align-items-center p-3">
                  <h5 className="mb-0">Please Log In</h5>
                </div>
                <div className="card-body" style={{ position: 'relative', height: '400px' }}>
                  <p>You need to log in to use the chat. <a href="/login">Go to Login</a></p>
                  {error && <p className="text-danger">{error}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <style>
        {`
          #chat2 .form-control {
            border-color: transparent;
          }

          #chat2 .form-control:focus {
            border-color: transparent;
            box-shadow: inset 0px 0px 0px 1px transparent;
          }

          .divider:after,
          .divider:before {
            content: "";
            flex: 1;
            height: 1px;
            background: #eee;
          }

          .join-container {
            text-align: center;
            padding: 40px;
            background-image: url('/assets/img/background.jpg');
            background-size: cover;
            background-position: center;
            border-radius: 10px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }

          .join-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
           background: rgba(103, 153, 214, 0.4); /* Overlay to improve text readability */
            border-radius: 10px;
            z-index: 1;
          }

          .join-container h5 {
            color: #fff;
            font-size: 1.8rem;
            margin-bottom: 20px;
            z-index: 2;
            text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
          }

          .join-container input[type="text"] {
            width: 70%;
            max-width: 350px;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 1rem;
            background-color: rgba(255, 255, 255, 0.9);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            z-index: 2;
            transition: background-color 0.3s ease;
          }

          .join-container input[type="text"]:focus {
            background-color: #fff;
            outline: none;
            box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
          }

          .join-container button {
            padding: 12px 25px;
            background-color: #007bff;
            border: none;
            border-radius: 5px;
            color: white;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 15px;
            z-index: 2;
            transition: background-color 0.3s ease, transform 0.2s ease;
          }

          .join-container button:hover {
            background-color: #0056b3;
            transform: translateY(-2px);
          }

          .join-container button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
            transform: none;
          }

          .error {
            color: #ff6b6b;
            font-size: 0.9rem;
            margin-top: 15px;
            z-index: 2;
            background-color: rgba(255, 255, 255, 0.8);
            padding: 5px 10px;
            border-radius: 5px;
          }

          .username {
            font-size: 0.9rem;
            font-weight: bold;
            margin-bottom: 5px;
          }

          .emoji-button {
            background: none;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0 10px;
            color: #666;
            transition: color 0.3s ease;
          }

          .emoji-button:hover {
            color: #007bff;
          }

          .emoji-picker-container {
            position: absolute;
            bottom: 60px; /* Position above the input area */
            right: 20px;
            z-index: 10;
          }
        `}
      </style>
      <section>
        <div className="container py-5">
          <div className="row d-flex justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-6">
              <div className="card" id="chat2">
                {!joinedRoom ? (
                  <div className="card-body join-container" style={{ position: 'relative', height: '400px' }}>
                    <h5 className="mb-4">Join a Chat Room</h5>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      onKeyPress={handleRoomKeyPress}
                      placeholder="Enter room code..."
                      className="form-control"
                    />
                    <button
                      onClick={joinRoom}
                      disabled={!roomCode.trim()}
                      className="btn btn-primary mt-3"
                    >
                      Join
                    </button>
                    {error && <p className="error">{error}</p>}
                  </div>
                ) : (
                  <>
                    <div className="card-header d-flex justify-content-between align-items-center p-3">
                      <h5 className="mb-0">Chat Room: {joinedRoom}</h5>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setJoinedRoom(null)}
                      >
                        Leave Room
                      </button>
                    </div>
                    <div
                      className="card-body"
                      data-mdb-perfect-scrollbar-init
                      style={{ position: 'relative', height: '400px', overflowY: 'auto' }}
                    >
                      {error && <p className="text-danger">{error}</p>}
                      {messages.length === 0 ? (
                        <p className="text-center">No messages yet</p>
                      ) : (
                        <>
                          <div className="divider d-flex align-items-center mb-4">
                            <p className="text-center mx-3 mb-0" style={{ color: '#a2aab7' }}>
                              Today
                            </p>
                          </div>
                          {messages.map((msg) => (
                            <div
                              key={msg._id}
                              className={`d-flex flex-row ${
                                msg.sender._id === userId ? 'justify-content-end mb-4 pt-1' : 'justify-content-start mb-4'
                              }`}
                            >
                              {msg.sender._id !== userId && (
                                <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                                  <img
                                    id="user-avatar"
                                    src={
                                      msg.sender?.user_photo
                                        ? `http://localhost:5000${msg.sender.user_photo}`
                                        : '/assets/img/user_icon.png'
                                    }
                                    alt={msg.sender.username || 'User Avatar'}
                                    style={{
                                      width: '45px',
                                      height: '45px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      objectFit: 'cover',
                                    }}
                                    onClick={() => window.location.href = '/student'}
                                  />
                                </div>
                              )}
                              <div>
                                <p
                                  className={`small username ${
                                    msg.sender._id === userId ? 'me-3 text-white' : 'ms-3'
                                  }`}
                                >
                                  {msg.sender.username || 'Unknown'}
                                </p>
                                <p
                                  className={`small p-2 ${
                                    msg.sender._id === userId ? 'me-3' : 'ms-3'
                                  } mb-1 rounded-3 ${
                                    msg.sender._id === userId ? 'text-white bg-primary' : 'bg-body-tertiary'
                                  }`}
                                >
                                  {msg.message}
                                </p>
                                <p
                                  className={`small ${
                                    msg.sender._id === userId ? 'me-3' : 'ms-3'
                                  } mb-3 rounded-3 text-muted ${
                                    msg.sender._id === userId ? 'd-flex justify-content-end' : ''
                                  }`}
                                >
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                              {msg.sender._id === userId && (
                                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '15px' }}>
                                  <img
                                    id="user-avatar"
                                    src={
                                      msg.sender?.user_photo
                                        ? `http://localhost:5000${msg.sender.user_photo}`
                                        : '/assets/img/user_icon.png'
                                    }
                                    alt={msg.sender.username || 'User Avatar'}
                                    style={{
                                      width: '45px',
                                      height: '45px',
                                      borderRadius: '50%',
                                      cursor: 'pointer',
                                      objectFit: 'cover',
                                    }}
                                    onClick={() => window.location.href = '/student'}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="card-footer text-muted d-flex justify-content-start align-items-center p-3 position-relative">
                      <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                        <img
                          id="user-avatar"
                          src={
                            messages.find((m) => m.sender._id === userId)?.sender?.user_photo
                              ? `http://localhost:5000${messages.find((m) => m.sender._id === userId).sender.user_photo}`
                              : '/assets/img/user_icon.png'
                          }
                          alt="User Avatar"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            objectFit: 'cover',
                          }}
                          onClick={() => window.location.href = '/student'}
                        />
                      </div>
                      <input
                        type="text"
                        className="form-control form-control-lg mx-3"
                        id="exampleFormControlInput1"
                        placeholder="Type message"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleMessageKeyPress}
                      />
                      <button
                        className="emoji-button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <i className="fas fa-smile"></i>
                      </button>
                      <button onClick={sendMessage} className="btn btn-link text-muted">
                        <i className="fas fa-paper-plane"></i>
                      </button>
                      <button onClick={fetchMessages} className="btn btn-link text-muted">
                        <i className="fas fa-sync-alt"></i>
                      </button>
                      {showEmojiPicker && (
                        <div className="emoji-picker-container">
                          <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Chat;