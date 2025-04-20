import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import EmojiPicker from 'emoji-picker-react';
import { jsPDF } from 'jspdf';
import { jwtDecode } from 'jwt-decode';
import VideoChat from './VideoChat';

// Crypto utilities
const importKeyFromRoomCode = async (roomCode) => {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(roomCode);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyMaterial);
  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
};

const encryptMessage = async (key, message) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);
  const encryptedMessage = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedMessage
  );
  return {
    encryptedMessage: arrayBufferToBase64(encryptedMessage),
    iv: arrayBufferToBase64(iv),
  };
};

const decryptMessage = async (key, { encryptedMessage, iv }) => {
  const decryptedMessage = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
    key,
    base64ToArrayBuffer(encryptedMessage)
  );
  return new TextDecoder().decode(decryptedMessage);
};

const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [sentMessages, setSentMessages] = useState(() => {
    const stored = localStorage.getItem('sentMessages');
    return stored ? JSON.parse(stored) : {};
  });
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingState, setRecordingState] = useState('idle');
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt-token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded = jwtDecode(storedToken);
        setUserId(decoded.id);
        setUserRole(decoded.role);
        console.log('Current userId:', decoded.id);
      } catch (err) {
        console.error('Error decoding token:', err);
        setError('Invalid token format');
      }
    } else {
      setError('Please log in first');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sentMessages', JSON.stringify(sentMessages));
  }, [sentMessages]);

  useEffect(() => {
    if (joinedRoom && token) {
      const initializeRoom = async () => {
        try {
          const key = await importKeyFromRoomCode(joinedRoom);
          await fetchMessages(key);
        } catch (err) {
          console.error('Error importing room key:', err);
          setError('Failed to initialize encryption');
        }
      };
      initializeRoom();
    }
  }, [joinedRoom, token]);

  useEffect(() => {
    if (joinedRoom && token) {
      let key;
      const startPolling = async () => {
        key = await importKeyFromRoomCode(joinedRoom);
        intervalRef.current = setInterval(() => {
          console.log('Polling messages...');
          fetchMessages(key);
        }, 5000);
      };
      startPolling();

      return () => {
        if (intervalRef.current) {
          console.log('Cleaning up interval:', intervalRef.current);
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [joinedRoom, token]);

  const fetchMessages = async (key) => {
    if (!joinedRoom || !token || !key) {
      console.log('Cannot fetch messages: Missing required fields', { joinedRoom, token, key: !!key });
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/users/chat/${joinedRoom}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const encryptedMessages = response.data || [];
      const decryptedMessages = await Promise.all(
        encryptedMessages.map(async (msg) => {
          if (msg.isVoice) {
            return { ...msg, message: '[Voice Message]' };
          }
          try {
            const ivBuffer = base64ToArrayBuffer(msg.iv);
            if (ivBuffer.byteLength !== 12) throw new Error('Invalid IV length');
            const decrypted = await decryptMessage(key, {
              encryptedMessage: msg.encryptedMessage,
              iv: msg.iv,
            });
            return { ...msg, message: decrypted };
          } catch (decryptErr) {
            console.error('Decryption error for message:', msg._id, decryptErr);
            if (msg.sender._id === userId) {
              const roomMessages = sentMessages[joinedRoom] || {};
              const messageContent = roomMessages[msg._id] || '[Your message]';
              return { ...msg, message: messageContent };
            }
            return { ...msg, message: '[Decryption failed]' };
          }
        })
      );

      setMessages(decryptedMessages);
      setPrevMessageCount(decryptedMessages.length);
      setError(null);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages: ' + (err.response?.data?.message || err.message || 'Network error'));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !joinedRoom || !token || !userId) {
      console.log('Cannot send message: Missing required fields', {
        newMessage: newMessage.trim(),
        joinedRoom,
        token,
        userId,
      });
      return;
    }
    try {
      const key = await importKeyFromRoomCode(joinedRoom);
      const { encryptedMessage, iv } = await encryptMessage(key, newMessage);
      const payload = { roomCode: joinedRoom, encryptedMessage, iv, isVoice: false };
      console.log('Sending message with payload:', payload);
      const response = await axios.post(
        'http://localhost:5000/users/chat',
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Message sent successfully:', response.data);
      const messageId = response.data.data._id;
      setSentMessages((prev) => {
        const updated = {
          ...prev,
          [joinedRoom]: {
            ...(prev[joinedRoom] || {}),
            [messageId]: newMessage,
          },
        };
        console.log('Updated sentMessages:', updated);
        return updated;
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      fetchMessages(key);
    } catch (err) {
      console.error('Error sending message:', err.response?.data || err.message);
      setError('Failed to send message: ' + (err.response?.data?.message || err.message || 'Network error'));
    }
  };

  const summarizeConversation = async () => {
    console.log('Starting summarizeConversation');
    
    if (messages.length === 0) {
      setSummary('No messages to summarize.');
      setShowSummaryModal(true);
      return;
    }
  
    setIsSummarizing(true);
    setError(null);
  
    const conversationText = messages
      .filter((msg) => !msg.isVoice)
      .map((msg) => `${msg.sender.username || 'Unknown'}: ${msg.message}`)
      .join('\n');
  
    if (!conversationText.trim()) {
      setSummary('No text messages available to summarize.');
      setShowSummaryModal(true);
      setIsSummarizing(false);
      return;
    }
  
    const hfToken = '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';
    try {
      console.log('Sending summarization request to Hugging Face API');
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          inputs: conversationText,
          parameters: {
            max_length: 100,
            min_length: 30,
            do_sample: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      console.log('Summarization response:', response.data);
      const summaryText = response.data[0]?.summary_text || 'Failed to generate summary.';
      setSummary(summaryText);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Error summarizing conversation:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      let errorMessage = 'Failed to summarize conversation.';
      if (err.response?.status === 401) {
        errorMessage = 'Unauthorized: Invalid Hugging Face API token.';
      } else if (err.response?.data?.error) {
        errorMessage = `Hugging Face API error: ${err.response.data.error}`;
      } else {
        errorMessage = `Error: ${err.message}`;
      }
      setError(errorMessage);
      setSummary('An error occurred while summarizing. Please try again.');
      setShowSummaryModal(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 5 * 1024 * 1024) {
          setError('Audio file too large. Keep it under 5MB.');
          setRecordingState('idle');
          setAudioBlob(null);
          setRecordingDuration(0);
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setAudioBlob(audioBlob);
        setRecordingState('stopped');
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingState('recording');
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      setTimeout(() => stopRecording(), 10000);
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to record voice messages.');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingState('idle');
      setAudioBlob(null);
      setRecordingDuration(0);
      clearInterval(timerRef.current);
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => setError('Failed to play recording: ' + err.message));
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob || !joinedRoom || !token || !userId) {
      console.log('Cannot send voice message: Missing required fields', { audioBlob, joinedRoom, token, userId });
      setError('Cannot send voice message: Missing required fields');
      return;
    }
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        const payload = {
          roomCode: joinedRoom,
          voiceMessage: base64Audio,
          isVoice: true,
        };
        console.log('Sending voice message payload:', {
          roomCode: payload.roomCode,
          voiceMessageLength: payload.voiceMessage.length,
          isVoice: payload.isVoice,
        });
        try {
          const response = await axios.post(
            'http://localhost:5000/users/chat',
            payload,
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          );
          console.log('Voice message sent successfully:', response.data);
          const messageId = response.data.data._id;
          setSentMessages((prev) => ({
            ...prev,
            [joinedRoom]: {
              ...(prev[joinedRoom] || {}),
              [messageId]: '[Voice Message]',
            },
          }));
          setAudioBlob(null);
          setRecordingState('idle');
          setRecordingDuration(0);
          const key = await importKeyFromRoomCode(joinedRoom);
          fetchMessages(key);
        } catch (err) {
          console.error('Voice message request failed:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
          setError('Failed to send voice message. Please try again later.');
          setRecordingState('stopped');
        }
      };
    } catch (err) {
      console.error('Error in sendVoiceMessage:', err);
      setError('Failed to send voice message. Please try again later.');
      setRecordingState('stopped');
    }
  };

  const playVoiceMessage = (base64Audio) => {
    const audio = new Audio(`data:audio/webm;base64,${base64Audio}`);
    audio.play().catch((err) => setError('Failed to play audio: ' + err.message));
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
    const normalizedRoomCode = roomCode.trim().toLowerCase();
    setJoinedRoom(normalizedRoomCode);
    setMessages([]);
    setPrevMessageCount(0);
    setError(null);
  };

  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const handleRoomKeyPress = (e) => {
    if (e.key === 'Enter') joinRoom();
  };

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
  
    const logoImg = new Image();
    logoImg.src = '/assets/img/logo/logo.png';
    await logoImg.decode();
  
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
  
    doc.addImage(logoImg, 'PNG', 10, 10, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text(`Chat Room: ${joinedRoom}`, pageWidth - 135, 15, { align: 'left' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 51, 102);
    doc.line(10, 45, pageWidth - 10, 45);
  
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Exported on: ${new Date().toLocaleString()}`, pageWidth - 10, 25, { align: 'right' });
  
    let yOffset = 55;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
  
    messages.forEach((msg, index) => {
      const sender = msg.sender?.username || 'Unknown';
      const time = new Date(msg.createdAt).toLocaleTimeString();
      const messageText = `[${time}] ${sender}: ${msg.isVoice ? '[Voice Message]' : msg.message}`;
  
      if (index % 2 === 0) {
        doc.setFillColor(240, 248, 255);
        doc.rect(10, yOffset - 4, pageWidth - 20, 10, 'F');
      }
  
      const splitText = doc.splitTextToSize(messageText, pageWidth - 40);
      splitText.forEach((line) => {
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          doc.addImage(logoImg, 'PNG', 10, 10, 30, 30);
          doc.setFontSize(18);
          doc.setTextColor(0, 51, 102);
          doc.text(`Chat Room: ${joinedRoom} (Continued)`, pageWidth / 2, 25, { align: 'center' });
          doc.line(10, 45, pageWidth - 10, 45);
          yOffset = 55;
        }
        doc.text(line, 15, yOffset);
        yOffset += 7;
      });
      yOffset += 3;
    });

    if (summary && !['No messages to summarize.', 'No text messages available to summarize.', 'Failed to generate summary.', 'An error occurred while summarizing. Please try again.'].includes(summary)) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 102, 204);
      doc.text('Conversation Summary', 15, yOffset);
      yOffset += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      const splitSummary = doc.splitTextToSize(summary, pageWidth - 40);
      splitSummary.forEach((line) => {
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          doc.addImage(logoImg, 'PNG', 10, 10, 30, 30);
          doc.setFontSize(18);
          doc.setTextColor(0, 51, 102);
          doc.text(`Chat Room: ${joinedRoom} (Continued)`, pageWidth / 2, 25, { align: 'center' });
          doc.line(10, 45, pageWidth - 10, 45);
          yOffset = 55;
        }
        doc.text(line, 15, yOffset);
        yOffset += 7;
      });
      yOffset += 5;
    }
  
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('EspritCare - Chat History', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
    doc.save(`chat_room_${joinedRoom}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const joinVideoChat = () => {
    if (!joinedRoom || !userId) {
      setError('Please join a room and ensure you are logged in.');
      return;
    }
    setShowVideoCall(true);
  };

  const closeVideoChat = () => {
    setShowVideoCall(false);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const toggleDropdown = (messageId) => {
    setActiveDropdown(activeDropdown === messageId ? null : messageId);
  };

  const deleteMessage = async (messageId) => {
    if (!token || !joinedRoom) return;
    try {
      await axios.delete(`http://localhost:5000/users/chat/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(messages.filter((msg) => msg._id !== messageId));
      setSentMessages((prev) => {
        const updated = { ...prev };
        if (updated[joinedRoom] && updated[joinedRoom][messageId]) {
          delete updated[joinedRoom][messageId];
        }
        return updated;
      });
      setActiveDropdown(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message: ' + (err.response?.data?.message || err.message));
    }
  };

  const startEditing = (messageId, currentMessage) => {
    setEditMessageId(messageId);
    setEditMessageContent(currentMessage);
    setActiveDropdown(null);
  };

  const updateMessage = async () => {
    if (!editMessageContent.trim() || !editMessageId || !joinedRoom || !token) return;
    try {
      const key = await importKeyFromRoomCode(joinedRoom);
      const { encryptedMessage, iv } = await encryptMessage(key, editMessageContent);
      await axios.put(
        `http://localhost:5000/users/chat/${editMessageId}`,
        { encryptedMessage, iv },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === editMessageId ? { ...msg, message: editMessageContent } : msg
        )
      );
      setSentMessages((prev) => ({
        ...prev,
        [joinedRoom]: {
          ...(prev[joinedRoom] || {}),
          [editMessageId]: editMessageContent,
        },
      }));
      setEditMessageId(null);
      setEditMessageContent('');
      fetchMessages(key);
    } catch (err) {
      console.error('Error updating message:', err);
      setError('Failed to update message: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!token) {
    return (
      <section className="auth-section">
        <div className="container py-5">
          <div className="row d-flex justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-6">
              <div className="card auth-card">
                <div className="card-header d-flex justify-content-between align-items-center p-3">
                  <h5 className="mb-0">Please Log In</h5>
                </div>
                <div className="card-body" style={{ position: 'relative', height: '400px' }}>
                  <p>
                    You need to log in to use the chat. <a href="/login">Go to Login</a>
                  </p>
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
          :root {
            --primary-blue: #87CEEB; /* Sky Blue */
            --dark-blue: #4682B4; /* Steel Blue */
            --light-blue: #B0E0E6; /* Powder Blue */
            --accent-blue: #00B7EB; /* Cyan */
            --primary-gradient: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%);
            --secondary-gradient: linear-gradient(135deg, #B0E0E6 0%, #87CEEB 100%);
            --bg-dark: #1a2a44; /* Dark Slate Blue */
            --bg-light: #f5faff; /* Light Blue Background */
            --text-dark: #16213e;
            --text-light: #ffffff;
            --error-color: #ff4757;
          }

          body {
            background: var(--bg-light);
            font-family: 'Inter', sans-serif;
            color: var(--text-dark);
          }

          .auth-section, .chat-section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            background: var(--bg-light);
          }

          .card {
            border: none;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            background: #ffffff;
            overflow: hidden;
            transition: transform 0.3s ease;
          }

          .card:hover {
            transform: translateY(-5px);
          }

          .auth-card {
            background: var(--primary-gradient);
            color: var(--text-light);
          }

          .card-header {
            background: var(--primary-gradient);
            color: var(--text-light);
            padding: 1.5rem;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .card-header .chat-icon {
            font-size: 1.5rem;
            margin-right: 0.5rem;
          }

          .card-body {
            background: #ffffff;
            padding: 2rem;
            position: relative;
            height: 500px;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--accent-blue) #e0e0e0;
          }

          .card-body::-webkit-scrollbar {
            width: 8px;
          }

          .card-body::-webkit-scrollbar-track {
            background: #e0e0e0;
            border-radius: 10px;
          }

          .card-body::-webkit-scrollbar-thumb {
            background: var(--accent-blue);
            border-radius: 10px;
          }

          .join-container {
            text-align: center;
            padding: 3rem;
            background: var(--secondary-gradient);
            border-radius: 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
          }

          .join-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 20px;
            z-index: 1;
          }

          .join-container h5 {
            color: var(--text-light);
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
            z-index: 2;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
          }

          .join-container .chat-icon {
            font-size: 2rem;
            margin-right: 0.5rem;
          }

          .join-container input[type="text"] {
            width: 80%;
            max-width: 400px;
            padding: 0.75rem;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            z-index: 2;
            transition: all 0.3s ease;
          }

          .join-container input[type="text"]:focus {
            background: #ffffff;
            box-shadow: 0 0 15px rgba(0, 183, 235, 0.5);
            outline: none;
          }

          .join-container button {
            padding: 0.75rem 2rem;
            background: var(--accent-blue);
            border: none;
            border-radius: 10px;
            color: var(--text-dark);
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 1rem;
            z-index: 2;
            transition: all 0.3s ease;
          }

          .join-container button:hover {
            background: #0099c7;
            transform: scale(1.05);
          }

          .join-container button:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
          }

          .error {
            color: var(--error-color);
            font-size: 0.9rem;
            margin-top: 1rem;
            z-index: 2;
            background: rgba(255, 255, 255, 0.9);
            padding: 0.5rem 1rem;
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          }

          .encryption-text {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.9rem;
            margin: 0;
            font-style: italic;
          }

          .message-wrapper {
            display: flex;
            flex-direction: column;
            margin-bottom: 1.5rem;
            animation: slideIn 0.3s ease;
          }

          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .username {
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 0.3rem;
            color: var(--text-dark);
          }

          .message-content {
            max-width: 70%;
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            line-height: 1.4;
            border-radius: 15px;
            position: relative;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            transition: background 0.3s ease;
          }

          .message-content.bg-primary {
            background: var(--primary-gradient);
            color: var(--text-light);
          }

          .message-content.bg-body-tertiary {
            background: var(--light-blue);
            color: var(--text-dark);
          }

          .message-content:hover {
            filter: brightness(1.05);
          }

          .timestamp {
            font-size: 0.7rem;
            color: #6c757d;
            margin-top: 0.2rem;
          }

          .dropdown-toggle::after {
            display: none;
          }

          .dropdown-menu {
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            min-width: 120px;
            background: #ffffff;
          }

          .dropdown-item {
            font-size: 0.9rem;
            padding: 0.5rem 1rem;
            transition: background 0.2s ease;
          }

          .dropdown-item:hover {
            background: var(--accent-blue);
            color: var(--text-dark);
          }

          .edit-input-container {
            display: flex;
            align-items: center;
            max-width: 70%;
          }

          .edit-input {
            border-radius: 10px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }

          .card-footer {
            background: #ffffff;
            border-top: 1px solid #e0e0e0;
            padding: 1rem;
            display: flex;
            align-items: center;
            position: relative;
          }

          .form-control {
            border-radius: 10px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }

          .form-control:focus {
            border-color: var(--accent-blue);
            box-shadow: 0 0 10px rgba(0, 183, 235, 0.3);
          }

          .emoji-button, .video-button, .voice-button, .refresh-button, .send-button {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--dark-blue);
            transition: all 0.3s ease;
          }

          .emoji-button:hover, .video-button:hover, .refresh-button:hover, .send-button:hover {
            color: var(--accent-blue);
            transform: scale(1.1);
          }

          .voice-button {
            color: ${isRecording ? 'var(--error-color)' : 'var(--dark-blue)'};
          }

          .voice-button:hover {
            color: ${isRecording ? '#e63946' : 'var(--accent-blue)'};
          }

          .play-voice-button {
            background: none;
            border: none;
            font-size: 1rem;
            cursor: pointer;
            color: var(--accent-blue);
            margin-left: 0.5rem;
            transition: color 0.3s ease;
          }

          .play-voice-button:hover {
            color: #0099c7;
          }

          .emoji-picker-container {
            position: absolute;
            bottom: 70px;
            right: 20px;
            z-index: 100;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            overflow: hidden;
          }

          .export-pdf-icon, .leave-room-icon, .summary-button {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--dark-blue);
            transition: all 0.3s ease;
          }

          .export-pdf-icon:hover {
            color: var(--accent-blue);
            transform: scale(1.1);
          }

          .leave-room-icon:hover {
            color: var(--error-color);
            transform: scale(1.1);
          }

          .summary-button:hover {
            color: var(--accent-blue);
            transform: scale(1.1);
          }

          .video-call-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .video-call-content {
            background: #ffffff;
            width: 90%;
            max-width: 900px;
            height: 80%;
            max-height: 650px;
            border-radius: 20px;
            position: relative;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }

          .close-video-call {
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--error-color);
            color: var(--text-light);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .close-video-call:hover {
            background: #e63946;
            transform: scale(1.05);
          }

          .summary-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }

          .summary-content {
            background: #ffffff;
            width: 90%;
            max-width: 600px;
            padding: 1.5rem;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          }

          .close-summary {
            position: absolute;
            top: 15px;
            right: 15px;
            background: var(--error-color);
            color: var(--text-light);
            border: none;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .close-summary:hover {
            background: #e63946;
            transform: scale(1.05);
          }

          .summary-text {
            max-height: 400px;
            overflow-y: auto;
            padding: 1rem;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            margin-bottom: 1rem;
            background: var(--light-blue);
          }

          .audio-recorder {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--light-blue);
            border-radius: 10px;
            padding: 0.75rem;
            width: 100%;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
          }

          .audio-recorder:hover {
            background: #a0d6e0;
          }

          .audio-recorder button {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--dark-blue);
            transition: all 0.3s ease;
          }

          .audio-recorder button:hover {
            color: var(--accent-blue);
            transform: scale(1.1);
          }

          .audio-recorder .cancel-button:hover {
            color: var(--error-color);
          }

          .audio-recorder .stop-button:hover {
            color: var(--error-color);
          }

          .audio-recorder .duration {
            font-size: 1rem;
            color: var(--text-dark);
            margin: 0 0.5rem;
            font-weight: 500;
          }

          .audio-recorder .recording-indicator {
            width: 12px;
            height: 12px;
            background: var(--error-color);
            border-radius: 50%;
            margin-right: 0.5rem;
            animation: pulse 1.5s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }

          .divider {
            display: none;
          }

          .message-content .dropdown-toggle {
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .message-content:hover .dropdown-toggle {
            opacity: 1;
          }

          .btn-primary {
            background: var(--accent-blue);
            border: none;
            border-radius: 10px;
            transition: all 0.3s ease;
          }

          .btn-primary:hover {
            background: #0099c7;
            transform: scale(1.05);
          }

          .btn-secondary {
            background: #6c757d;
            border: none;
            border-radius: 10px;
            transition: all 0.3s ease;
          }

          .btn-secondary:hover {
            background: #5a6268;
            transform: scale(1.05);
          }

          #user-avatar {
            transition: all 0.3s ease;
          }

          #user-avatar:hover {
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(0, 183, 235, 0.5);
          }
        `}
      </style>
      <section className="chat-section">
        <div className="container py-5">
          <div className="row d-flex justify-content-center">
            <div className="col-md-10 col-lg-8 col-xl-6">
              <div className="card" id="chat2">
                {!joinedRoom ? (
                  <div className="card-body join-container">
                    <h5>
                      <i className="fas fa-comments chat-icon"></i> Join a Chat Room
                    </h5>
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
                    <div className="card-header">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-comments chat-icon"></i>
                        <h5 className="mb-0 me-2">Chat Room</h5>
                        <p className="encryption-text mb-0">End-to-end encrypted</p>
                      </div>
                      <div>
                        {userRole === 'psychiatrist' && (
                          <>
                            <button
                              onClick={summarizeConversation}
                              className="summary-button me-2"
                              title="Summarize Conversation"
                              disabled={isSummarizing}
                            >
                              <i className="fas fa-book-open"></i>
                            </button>
                            <button
                              onClick={exportToPDF}
                              className="export-pdf-icon me-2"
                              title="Export to PDF"
                            >
                              <i className="fas fa-file-pdf"></i>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setJoinedRoom(null)}
                          className="leave-room-icon"
                          title="Leave Room"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      </div>
                    </div>
                    <div
                      className="card-body"
                      data-mdb-perfect-scrollbar-init
                    >
                      {error && <p className="text-danger">{error}</p>}
                      {messages.length === 0 ? (
                        <p className="text-center">No messages yet</p>
                      ) : (
                        <>
                          {messages.map((msg) => (
                            <div
                              key={msg._id}
                              className={`d-flex flex-row ${
                                msg.sender._id === userId ? 'justify-content-end' : 'justify-content-start'
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
                                    onClick={() => (window.location.href = '/student')}
                                  />
                                </div>
                              )}
                              {msg.sender._id === userId ? (
                                <>
                                  <div className="message-wrapper">
                                    <p className="small username me-3">
                                      {msg.sender.username || 'Unknown'}
                                    </p>
                                    {editMessageId === msg._id ? (
                                      <div className="edit-input-container">
                                        <input
                                          type="text"
                                          className="form-control edit-input"
                                          value={editMessageContent}
                                          onChange={(e) => setEditMessageContent(e.target.value)}
                                          onKeyPress={(e) => e.key === 'Enter' && updateMessage()}
                                        />
                                        <button onClick={updateMessage} className="btn btn-sm btn-primary">
                                          Save
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditMessageId(null);
                                            setEditMessageContent('');
                                          }}
                                          className="btn btn-sm btn-secondary ms-2"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <p
                                          className={`small message-content me-3 mb-0 rounded-3 bg-primary`}
                                          style={{ alignSelf: 'flex-end' }}
                                        >
                                          {msg.isVoice ? (
                                            <>
                                              [Voice Message]
                                              <button
                                                className="play-voice-button"
                                                onClick={() => playVoiceMessage(msg.voiceMessage)}
                                              >
                                                <i className="fas fa-play"></i>
                                              </button>
                                            </>
                                          ) : (
                                            msg.message
                                          )}
                                          {!msg.isVoice && (
                                            <button
                                              className="btn btn-link p-0 ms-2 dropdown-toggle"
                                              onClick={() => toggleDropdown(msg._id)}
                                              style={{ color: 'inherit', textDecoration: 'none' }}
                                            >
                                              <i className="fas fa-ellipsis-v"></i>
                                            </button>
                                          )}
                                        </p>
                                        {activeDropdown === msg._id && !msg.isVoice && (
                                          <div
                                            className="dropdown-menu show"
                                            style={{
                                              position: 'absolute',
                                              right: '0',
                                              zIndex: 10,
                                            }}
                                          >
                                            <button
                                              className="dropdown-item"
                                              onClick={() => startEditing(msg._id, msg.message)}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="dropdown-item text-danger"
                                              onClick={() => deleteMessage(msg._id)}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                        <p
                                          className="small timestamp me-3 text-muted d-flex justify-content-end"
                                          style={{ alignSelf: 'flex-end' }}
                                        >
                                          {new Date(msg.createdAt).toLocaleTimeString()}
                                        </p>
                                      </>
                                    )}
                                  </div>
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
                                      onClick={() => (window.location.href = '/student')}
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="message-wrapper">
                                    <p className="small username ms-3">
                                      {msg.sender.username || 'Unknown'}
                                    </p>
                                    <p
                                      className={`small message-content ms-3 mb-0 rounded-3 bg-body-tertiary`}
                                      style={{ alignSelf: 'flex-start' }}
                                    >
                                      {msg.isVoice ? (
                                        <>
                                          [Voice Message]
                                          <button
                                            className="play-voice-button"
                                            onClick={() => playVoiceMessage(msg.voiceMessage)}
                                          >
                                            <i className="fas fa-play"></i>
                                          </button>
                                        </>
                                      ) : (
                                        msg.message
                                      )}
                                    </p>
                                    <p
                                      className="small timestamp ms-3 text-muted"
                                      style={{ alignSelf: 'flex-start' }}
                                    >
                                      {new Date(msg.createdAt).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="card-footer">
                      {recordingState === 'idle' ? (
                        <>
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
                              onClick={() => (window.location.href = '/student')}
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
                          <button className="voice-button" onClick={startRecording}>
                            <i className="fas fa-microphone"></i>
                          </button>
                          <button
                            className="emoji-button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          >
                            <i className="fas fa-smile"></i>
                          </button>
                          <button onClick={sendMessage} className="send-button">
                            <i className="fas fa-paper-plane"></i>
                          </button>
                          <button
                            onClick={async () => {
                              const key = await importKeyFromRoomCode(joinedRoom);
                              fetchMessages(key);
                            }}
                            className="refresh-button"
                          >
                            <i className="fas fa-sync-alt"></i>
                          </button>
                          <button onClick={joinVideoChat} className="video-button">
                            <i className="fas fa-video"></i>
                          </button>
                          {showEmojiPicker && (
                            <div className="emoji-picker-container">
                              <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="audio-recorder">
                          {recordingState === 'recording' && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div className="recording-indicator"></div>
                                <span className="duration">{formatDuration(recordingDuration)}</span>
                              </div>
                              <button onClick={pauseRecording}>
                                <i className="fas fa-pause"></i>
                              </button>
                              <button onClick={stopRecording} className="stop-button">
                                <i className="fas fa-stop"></i>
                              </button>
                            </>
                          )}
                          {recordingState === 'paused' && (
                            <>
                              <span className="duration">{formatDuration(recordingDuration)}</span>
                              <button onClick={resumeRecording}>
                                <i className="fas fa-play"></i>
                              </button>
                              <button onClick={stopRecording} className="stop-button">
                                <i className="fas fa-stop"></i>
                              </button>
                            </>
                          )}
                          {recordingState === 'stopped' && (
                            <>
                              <span className="duration">{formatDuration(recordingDuration)}</span>
                              <button onClick={playRecording}>
                                <i className="fas fa-play"></i>
                              </button>
                              <button onClick={sendVoiceMessage} className="send-button">
                                <i className="fas fa-paper-plane"></i>
                              </button>
                            </>
                          )}
                          <button onClick={cancelRecording} className="cancel-button">
                            <i className="fas fa-trash"></i>
                          </button>
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
      {showVideoCall && (
        <div className="video-call-modal">
          <div className="video-call-content">
            <button onClick={closeVideoChat} className="close-video-call">
              Close
            </button>
            <VideoChat userId={userId} roomCode={joinedRoom} onClose={closeVideoChat} />
          </div>
        </div>
      )}
      {showSummaryModal && (
        <div className="summary-modal">
          <div className="summary-content">
            <button
              className="close-summary"
              onClick={() => setShowSummaryModal(false)}
            >
              Close
            </button>
            <h5>Conversation Summary</h5>
            <div className="summary-text">
              {isSummarizing ? (
                <p>Summarizing conversation...</p>
              ) : (
                <>
                  {error && <p className="text-danger">{error}</p>}
                  <p>{summary}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;