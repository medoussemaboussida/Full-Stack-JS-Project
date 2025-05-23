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
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [messageEmotions, setMessageEmotions] = useState({});
  const [showEmotionForMessage, setShowEmotionForMessage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translatedMessages, setTranslatedMessages] = useState({});

  const GROQ_API___KEY = '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';
  const tts_tts = 'sk_f7fbb0e46b8d1a9d5107ef782723f2c1b4341ddf39934fb8';
  const HUGGING_FACE_API_KEY = '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';

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

  const detectEmotion = async (text) => {
    if (!text || text === '[Decryption failed]' || text === '[Voice Message]') {
      return { dominant: 'unknown', scores: {} };
    }
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const results = response.data[0];
      const dominantEmotion = results.reduce((max, curr) =>
        curr.score > max.score ? curr : max
      );
      const scores = results.reduce((acc, curr) => {
        acc[curr.label] = curr.score;
        return acc;
      }, {});
      return { dominant: dominantEmotion.label, scores };
    } catch (err) {
      console.error('Emotion detection error:', err);
      setError('Failed to detect emotion: ' + (err.response?.data?.error || err.message));
      return { dominant: 'unknown', scores: {} };
    }
  };

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
            const emotionData = await detectEmotion(decrypted);
            setMessageEmotions((prev) => ({
              ...prev,
              [msg._id]: emotionData,
            }));
            return { 
              ...msg, 
              message: decrypted
            };
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
      const emotionData = await detectEmotion(newMessage);
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
      setMessageEmotions((prev) => ({
        ...prev,
        [messageId]: emotionData,
      }));
      setNewMessage('');
      setShowEmojiPicker(false);
      fetchMessages(key);
    } catch (err) {
      console.error('Error sending message:', err.response?.data || err.message);
      setError('Failed to send message: ' + (err.response?.data?.message || err.message || 'Network error'));
    }
  };

  const speakMessage = async (text) => {
    if (!text || text === '[Decryption failed]' || text === '[Voice Message]') {
      console.log('Skipping TTS for invalid text:', text);
      setError('Cannot convert this message to speech.');
      return;
    }
    try {
      const languageMap = { en: 'en', fr: 'fr', es: 'es', de: 'de' };
      const language = languageMap[targetLanguage] || 'en';
      const response = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 },
        },
        {
          headers: {
            'xi-api-key': tts_tts,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
        }
      );
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play().catch((err) => {
        console.error('Audio playback error:', err);
        setError('Failed to play audio: ' + err.message);
      });
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (err) {
      console.error('TTS error:', err);
      let errorMessage = 'Failed to convert text to speech';
      if (err.response?.status === 401) errorMessage = 'Text-to-speech failed: Invalid API key';
      else if (err.response?.status === 429) errorMessage = 'Text-to-speech quota exceeded.';
      else if (err.response?.status === 400) errorMessage = 'Invalid request.';
      setError(errorMessage);
    }
  };

  const translateMessage = async (text, targetLang) => {
    if (!text || text === '[Decryption failed]' || text === '[Voice Message]') {
      console.log('Skipping translation for invalid text:', text);
      return text;
    }
    if (!GROQ_API___KEY) {
      console.error('Groq API key is missing');
      setError('Translation failed: API key is missing');
      return text;
    }
    try {
      const languageMap = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
      const targetLanguageName = languageMap[targetLang] || 'English';
      const prompt = `Translate the following text to ${targetLanguageName} and return only the translated text: "${text}"`;
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API___KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return response.data.choices[0]?.message?.content?.trim() || text;
    } catch (err) {
      console.error('Translation error:', err);
      let errorMessage = 'Failed to translate message';
      if (err.response?.status === 400) errorMessage = `Translation failed: ${err.response?.data?.error}`;
      else if (err.response?.status === 401) errorMessage = 'Translation failed: Invalid API key';
      else if (err.response?.status === 429) errorMessage = 'Translation quota exceeded.';
      else if (err.code === 'ECONNABORTED') errorMessage = 'Translation request timed out.';
      setError(errorMessage);
      return text;
    }
  };

  const handleTranslate = async (messageId, text) => {
    const translatedText = await translateMessage(text, targetLanguage);
    setTranslatedMessages((prev) => ({
      ...prev,
      [messageId]: { text: translatedText },
    }));
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
      .map((msg) => {
        if (!msg.isVoice) {
          return `${msg.sender.username || 'Unknown'}: ${msg.message}`;
        }
        return '';
      })
      .filter((text) => text)
      .join('\n');
    if (!conversationText.trim()) {
      setSummary('No text messages available to summarize.');
      setShowSummaryModal(true);
      setIsSummarizing(false);
      return;
    }
    if (!GROQ_API___KEY) {
      console.error('Groq API key is missing');
      setError('Summarization failed: API key is missing');
      setSummary('An error occurred while summarizing.');
      setShowSummaryModal(true);
      setIsSummarizing(false);
      return;
    }
    try {
      const prompt = `Summarize the following conversation concisely in up to 100 words:\n\n${conversationText}`;
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama3-70b-8192',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API___KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      const summaryText = response.data.choices[0]?.message?.content?.trim() || 'Failed to generate summary.';
      setSummary(summaryText);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Error summarizing conversation:', err);
      let errorMessage = 'Failed to summarize conversation.';
      if (err.response?.status === 400) errorMessage = `Summarization failed: ${err.response?.data?.error}`;
      else if (err.response?.status === 401) errorMessage = 'Summarization failed: Invalid API key';
      else if (err.response?.status === 429) errorMessage = 'Summarization quota exceeded.';
      else if (err.code === 'ECONNABORTED') errorMessage = 'Summarization request timed out.';
      setError(errorMessage);
      setSummary('An error occurred while summarizing.');
      setShowSummaryModal(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        if (audioBlob.size > 5 * 1024 * 1024) {
          setError('Audio file too large. Keep it under 5MB.');
          setIsRecording(false);
          return;
        }
        if (audioBlob.size === 0) {
          setError('No audio recorded.');
          setIsRecording(false);
          return;
        }
        await sendVoiceMessage(audioBlob);
      };
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError(`Recording failed: ${event.error.name}`);
        setIsRecording(false);
        stopStream();
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      console.log('Recording started with MIME type:', mimeType);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(`Failed to start recording: ${err.message}`);
      if (err.name === 'NotAllowedError') setError('Microphone access denied.');
      else if (err.name === 'NotSupportedError') setError('Audio recording not supported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopStream();
      console.log('Recording stopped');
    } else {
      console.log('No active recording to stop');
      setIsRecording(false);
      stopStream();
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const sendVoiceMessage = async (audioBlob) => {
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
        if (!base64Audio) {
          setError('Failed to encode audio.');
          setIsRecording(false);
          return;
        }
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
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
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
            setIsRecording(false);
            const key = await importKeyFromRoomCode(joinedRoom);
            fetchMessages(key);
            return;
          } catch (err) {
            attempts++;
            console.error(`Voice message attempt ${attempts} failed:`, err);
            if (attempts === maxAttempts) {
              setError('Failed to send voice message after multiple attempts.');
              setIsRecording(false);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      };
      reader.onerror = () => {
        setError('Failed to read audio data.');
        setIsRecording(false);
      };
    } catch (err) {
      console.error('Error in sendVoiceMessage:', err);
      setError('Failed to send voice message: ' + err.message);
      setIsRecording(false);
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

  const toggleEmotionDisplay = (messageId) => {
    setShowEmotionForMessage((prev) => (prev === messageId ? null : messageId));
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
      const emotion = messageEmotions[msg._id]?.dominant;
      const emotionText = emotion && emotion !== 'unknown' ? ` [${emotion}]` : '';
      const messageText = msg.isVoice
        ? `[${time}] ${sender}: [Voice Message]${emotionText}`
        : `[${time}] ${sender}: ${msg.message}${emotionText}`;
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
    if (summary && !['No messages to summarize.', 'No text messages available to summarize.', 'Failed to generate summary.', 'An error occurred while summarizing.'].includes(summary)) {
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
      setMessageEmotions((prev) => {
        const updated = { ...prev };
        delete updated[messageId];
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
      const emotionData = await detectEmotion(editMessageContent);
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
      setMessageEmotions((prev) => ({
        ...prev,
        [editMessageId]: emotionData,
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
                    You need to log in to use the chat. <button onClick={() => (window.location.href = '/login')} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}>Go to Login</button>
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
            --primary-blue: #87CEEB;
            --dark-blue: #4682B4;
            --light-blue: #B0E0E6;
            --accent-blue: #00B7EB;
            --primary-gradient: linear-gradient(135deg, #87CEEB 0%, #4682B4 100%);
            --secondary-gradient: linear-gradient(135deg, #B0E0E6 0%, #87CEEB 100%);
            --bg-dark: #1a2a44;
            --bg-light: #f5faff;
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
            box-shadow: 0 3px 10px rgba(0, 0, 0 0.1);
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

          .translated-text {
            font-size: 0.9rem;
            color: #4682B4;
            margin-top: 0.5rem;
            background: #f0f8ff;
            padding: 0.5rem;
            border-radius: 10px;
          }

          .emotion-badge {
            font-size: 0.8rem;
            padding: 0.3rem 0.6rem;
            margin-left: 0.5rem;
            border-radius: 12px;
            cursor: pointer;
            background-color: #e0f7fa;
            color: #006064;
            transition: all 0.3s ease;
          }

          .emotion-badge:hover {
            background-color: #b2ebf2;
            transform: scale(1.05);
          }

          .emotion-button {
            background: none;
            border: none;
            font-size: 1rem;
            cursor: pointer;
            color: var(--accent-blue);
            margin-left: 0.5rem;
            transition: color 0.3s ease;
          }

          .emotion-button:hover {
            color: #0099c7;
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

          .emoji-button, .video-button, .voice-button, .refresh-button, .send-button, .translate-button {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--dark-blue);
            transition: all 0.3s ease;
          }

          .emoji-button:hover, .video-button:hover, .refresh-button:hover, .send-button:hover, .translate-button:hover {
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
            color: var(--accent-white);
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

          .language-select {
            border-radius: 10px;
            border: 1px solid #e0e0e0;
            padding: 0.5rem;
            font-size: 0.9rem;
            margin-right: 0.5rem;
          }

          #user-avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            object-fit: cover;
            margin-right: 0.5rem;
            transition: all 0.3s ease;
          }

          #user-avatar:hover {
            transform: scale(1.1);
            box-shadow: 0 0 10px rgba(0, 183, 235, 0.5);
          }

          .link-button {
            background: none;
            border: none;
            color: #007bff;
            text-decoration: underline;
            cursor: pointer;
            padding: 0;
            margin: 0;
          }

          .link-button:hover {
            color: #0056b3;
          }
        `}
      </style>
           {/* Breadcrumb */}
           <div
        className="site-breadcrumb"
        style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Chat Room</h2>
          <ul className="breadcrumb-menu">
            <li>
              <a href="/Home">Home</a>
            </li>
            <li className="active">Chat</li>
          </ul>
        </div>
      </div>
      {/* Breadcrumb end */}
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
                      style={{borderRadius:"50px"}}
                      
                    />
                    <button
                      onClick={joinRoom}
                      disabled={!roomCode.trim()}
                      className="btn btn-primary mt-3"
                      style={{borderRadius:"50px"}}
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
                        <button
                          onClick={joinVideoChat}
                          className="video-button me-2"
                          title="Start Video Call"
                        >
                          <i className="fas fa-video" style={{color:"white"}}></i>
                        </button>
                        {userRole === 'psychiatrist' && (
                          <>
                            <button
                              onClick={summarizeConversation}
                              className="summary-button me-2"
                              title="Summarize Conversation"
                              disabled={isSummarizing}
                            >
                              <i className="fas fa-book-open" style={{color:"white"}}></i>
                            </button>
                            <button
                              onClick={exportToPDF}
                              className="export-pdf-icon me-2"
                              title="Export to PDF"
                            >
                              <i className="fas fa-file-pdf" style={{color:"white"}}></i>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setJoinedRoom(null);
                            setMessages([]);
                            setRoomCode('');
                            setShowVideoCall(false);
                          }}
                          className="leave-room-icon"
                          title="Leave Room"
                        >
                          <i className="fas fa-sign-out-alt" style={{color:"white"}}></i>
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {messages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`message-wrapper ${
                            msg.sender._id === userId ? 'ms-auto text-end' : 'me-auto text-start'
                          }`}
                        >
                          <div className="username-container">
                            <img
                              id="user-avatar"
                              src={
                                msg.sender.user_photo
                                  ? `http://localhost:5000${msg.sender.user_photo}`
                                  : '/assets/img/user_icon.png'
                              }
                              alt={`${msg.sender.username ? msg.sender.username : 'Anonymous User'}'s avatar`}
                            />
                            <div className="username">
                              {msg.sender.username
                                ? msg.sender.username.charAt(0).toUpperCase() + msg.sender.username.slice(1)
                                : 'Anonymous User'}
                            </div>
                          </div>
                          {editMessageId === msg._id ? (
                            <div className="edit-input-container">
                              <input
                                type="text"
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="form-control edit-input"
                              />
                              <button 
                                onClick={updateMessage}
                                className="btn btn-primary ms-2"
                                 style={{borderRadius:"50px",fontSize:"14px"}}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditMessageId(null);
                                  setEditMessageContent('');
                                }}
                                className="btn btn-danger ms-2"
                                 style={{borderRadius:"50px",fontSize:"14px"}}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              className={`message-content ${
                                msg.sender._id === userId ? 'bg-primary' : 'bg-body-tertiary'
                              }`}
                            >
                              {msg.isVoice ? (
                                <button
                                  onClick={() => playVoiceMessage(msg.voiceMessage)}
                                  className="play-voice-button"
                                >
                                  Play Voice Message
                                </button>
                              ) : (
                                <>
                                  {msg.message}
                                  {!msg.isVoice && (
                                    <button
                                      onClick={() => toggleEmotionDisplay(msg._id)}
                                      className="emotion-button"
                                    >
                                      <i className="fas fa-smile" style={{color:"white"}}></i>
                                    </button>
                                  )}
                                  {showEmotionForMessage === msg._id &&
                                    messageEmotions[msg._id]?.dominant &&
                                    messageEmotions[msg._id].dominant !== 'unknown' && (
                                      <span
                                        className="emotion-badge"
                                        title={Object.entries(messageEmotions[msg._id].scores)
                                          .map(([emotion, score]) => `${emotion}: ${(score * 100).toFixed(2)}%`)
                                          .join('\n')}
                                      >
                                        {messageEmotions[msg._id].dominant}
                                      </span>
                                    )}
                                </>
                              )}
                              {msg.sender._id === userId && !msg.isVoice && (
                                <div className="dropdown d-inline-block ms-2">
                                  <button
                                    className="btn btn-link dropdown-toggle"
                                    type="button"
                                    onClick={() => toggleDropdown(msg._id)}
                                  >
                                    <i className="fas fa-ellipsis-v" style={{color:"white"}}></i>
                                  </button>
                                  {activeDropdown === msg._id && (
                                    <ul className="dropdown-menu show">
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => startEditing(msg._id, msg.message)}
                                        >
                                          Edit
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          className="dropdown-item"
                                          onClick={() => deleteMessage(msg._id)}
                                        >
                                          Delete
                                        </button>
                                      </li>
                                    </ul>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => speakMessage(msg.message)}
                                className="btn btn-link ms-2"
                              >
                                <i className="fas fa-volume-up" style={{color:"white"}}></i>
                              </button>
                              <button
                                onClick={() => handleTranslate(msg._id, msg.message)}
                                className="btn btn-link ms-2"
                              >
                                <i className="fas fa-language" style={{color:"white"}}></i>
                              </button>
                            </div>
                          )}
                          {translatedMessages[msg._id] && (
                            <div className="translated-text">
                              Translated: {translatedMessages[msg._id].text}
                            </div>
                          )}
                          <div className="timestamp">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="card-footer">
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="language-select"
                         style={{borderRadius:"50px"}}

                      >
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                      </select>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleMessageKeyPress}
                        placeholder="Type a message..."
                        className="form-control"
                        style={{borderRadius:"50px"}}
                      />
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="emoji-button ms-2"
                      >
                        <i className="fas fa-smile"></i>
                      </button>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className="voice-button ms-2"
                      >
                        <i className={isRecording ? 'fas fa-stop' : 'fas fa-microphone'}></i>
                      </button>
                      <button
                        onClick={sendMessage}
                        className="send-button ms-2"
                      >
                        <i className="fas fa-paper-plane"></i>
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

      {showSummaryModal && (
        <div className="summary-modal">
          <div className="summary-content">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="close-summary"
            >
              Close
            </button>
            <h5>Conversation Summary</h5>
            <div className="summary-text">{summary}</div>
          </div>
        </div>
      )}

      {showVideoCall && (
        <div className="video-call-modal">
          <div className="video-call-content">
            <button
              onClick={closeVideoChat}
              className="close-video-call"
            >
              Close
            </button>
            <VideoChat roomCode={joinedRoom} userId={userId} />
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;