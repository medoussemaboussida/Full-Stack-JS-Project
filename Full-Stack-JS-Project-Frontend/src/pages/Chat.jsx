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
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const [questionnaireResponses, setQuestionnaireResponses] = useState({
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
  });
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editMessageId, setEditMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translatedMessages, setTranslatedMessages] = useState({});

  const GROQ_API_KEY = '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';
  const tts_new = 'sk_9a528300cb9d0fde2f09a122f90b3895d0f5adca31387585';

  const questions = [
    { id: 'q1', text: 'Feeling down, depressed, or hopeless?' },
    { id: 'q2', text: 'Little interest or pleasure in doing things?' },
    { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much?' },
    { id: 'q4', text: 'Feeling tired or having little energy?' },
    { id: 'q5', text: 'Poor appetite or overeating?' },
  ];

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
          if (msg.isQuestionnaireLink) {
            return { ...msg, message: 'Click to take the depression score questionnaire' };
          }
          try {
            const ivBuffer = base64ToArrayBuffer(msg.iv);
            if (ivBuffer.byteLength !== 12) throw new Error('Invalid IV length');
            const decrypted = await decryptMessage(key, {
              encryptedMessage: msg.encryptedMessage,
              iv: msg.iv,
            });
            return { ...msg, message: decrypted, isDepressionQuestion: decrypted.trim().toLowerCase() === 'do you want to test your depression score? (yes/no)' };
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
      const payload = { roomCode: joinedRoom, encryptedMessage, iv, isVoice: false, isQuestionnaireLink: false };
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

  const sendDepressionQuestion = async () => {
    if (!joinedRoom || !token || !userId) return;
    try {
      const key = await importKeyFromRoomCode(joinedRoom);
      const message = 'Do you want to test your depression score? (Yes/No)';
      const { encryptedMessage, iv } = await encryptMessage(key, message);
      const payload = { roomCode: joinedRoom, encryptedMessage, iv, isVoice: false, isQuestionnaireLink: false };
      const response = await axios.post(
        'http://localhost:5000/users/chat',
        payload,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const messageId = response.data.data._id;
      setSentMessages((prev) => ({
        ...prev,
        [joinedRoom]: {
          ...(prev[joinedRoom] || {}),
          [messageId]: message,
        },
      }));
      fetchMessages(key);
    } catch (err) {
      console.error('Error sending depression question:', err);
      setError('Failed to send depression question: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleYesClick = () => {
    setShowQuestionnaireModal(true);
  };

  const handleNoClick = () => {
    // Do nothing
  };

  const handleQuestionnaireSubmit = async () => {
    if (!token || !userId || !joinedRoom) {
      setError('Please log in and join a room to submit the questionnaire .');
      return;
    }
    try {
      const responses = questions.map((q) => ({
        question: q.text,
        answer: questionnaireResponses[q.id],
      }));
      const response = await axios.post(
        'http://localhost:5000/users/questionnaire/submit',
        { userId, roomCode: joinedRoom, responses },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log('Questionnaire submitted:', response.data);
      setShowQuestionnaireModal(false);
      setQuestionnaireResponses({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
      setError(null);
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError('Failed to submit questionnaire: ' + (err.response?.data?.message || err.message));
    }
  };

  const speakMessage = async (text) => {
    if (!text || text === '[Decryption failed]' || text === '[Voice Message]' || text.includes('questionnaire')) {
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
            'xi-api-key': tts_new,
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
    if (!text || text === '[Decryption failed]' || text === '[Voice Message]' || text.includes('questionnaire')) {
      console.log('Skipping translation for invalid text:', text);
      return text;
    }
    if (!GROQ_API_KEY) {
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
            Authorization: `Bearer ${GROQ_API_KEY}`,
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
        if (!msg.isVoice && !msg.isQuestionnaireLink) {
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
    if (!GROQ_API_KEY) {
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
            Authorization: `Bearer ${GROQ_API_KEY}`,
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
          isQuestionnaireLink: false,
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
      const messageText = msg.isVoice
        ? `[${time}] ${sender}: [Voice Message]`
        : msg.isQuestionnaireLink
        ? `[${time}] ${sender}: [Questionnaire Link]`
        : `[${time}] ${sender}: ${msg.message}`;
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
      setActiveDropdown(null);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message: ' + (err.response?.data?.message || err.message));
    }
  };

  const startEditing = (messageId, currentMessage) => {
    if (currentMessage.includes('questionnaire')) return;
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

          .translated-text {
            font-size: 0.9rem;
            color: #4682B4;
            margin-top: 0.5rem;
            background: #f0f8ff;
            padding: 0.5rem;
            border-radius: 10px;
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

          .emoji-button, .video-button, .voice-button, .refresh-button, .send-button, .translate-button, .questionnaire-button {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            padding: 0.5rem;
            color: var(--dark-blue);
            transition: all 0.3s ease;
          }

          .emoji-button:hover, .video-button:hover, .refresh-button:hover, .send-button:hover, .translate-button:hover, .questionnaire-button:hover {
            color: var(--accent-blue);
            transform: scale(1.1);
          }

          .voice-button {
            color: ${isRecording ? 'var(--error-color)' : 'var(--dark-blue)'};
          }

          .voice-button:hover {
            color: ${isRecording ? '#e63946' : 'var(--accent-blue)'};
          }

          .play-voice-button, .questionnaire-link {
            background: none;
            border: none;
            font-size: 1rem;
            cursor: pointer;
            color: var(--accent-blue);
            margin-left: 0.5rem;
            transition: color 0.3s ease;
          }

          .play-voice-button:hover, .questionnaire-link:hover {
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

         .questionnaire-modal {
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

          .questionnaire-content {
            background: #ffffff;
            width: 90%;
            max-width: 600px;
            padding: 1.5rem;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
          }

         .close-questionnaire {
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

          .close-questionnaire:hover {
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

          .questionnaire-form {
            max-height: 400px;
            overflow-y: auto;
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .questionnaire-form label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            display: block;
          }

          .questionnaire-form select {
            width: 100%;
            padding: 0.5rem;
            border-radius: 10px;
            border: 1px solid #e0e0e0;
            margin-bottom: 1rem;
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

          .response-buttons {
            margin-top: 0.5rem;
            display: flex;
            gap: 0.5rem;
          }

          .yes-button, .no-button {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
          }

          .yes-button {
            background: var(--accent-blue);
            color: var(--text-dark);
          }

          .yes-button:hover {
            background: #0099c7;
            transform: scale(1.05);
          }

          .no-button {
            background: #6c757d;
            color: var(--text-light);
          }

          .no-button:hover {
            background: #5a6268;
            transform: scale(1.05);
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
                        <button
                          onClick={joinVideoChat}
                          className="video-button me-2"
                          title="Start Video Call"
                        >
                          <i className="fas fa-video"></i>
                        </button>
                        {userRole === 'psychiatrist' && (
                          <>
                            <button
                              onClick={sendDepressionQuestion}
                              className="questionnaire-button me-2"
                              title="Send Depression Score Question"
                            >
                              <i className="fas fa-question-circle"></i>
                            </button>
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
                    <div className="card-body" data-mdb-perfect-scrollbar-init>
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
                                    alt={msg.sender.username || 'User'}
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
                              <div className="message-wrapper">
                                <div className="username">{msg.sender.username || 'Unknown'}</div>
                                {editMessageId === msg._id ? (
                                  <div className="edit-input-container">
                                    <input
                                      type="text"
                                      value={editMessageContent}
                                      onChange={(e) => setEditMessageContent(e.target.value)}
                                      className="form-control edit-input"
                                      placeholder="Edit message..."
                                    />
                                    <button onClick={updateMessage} className="btn btn-primary ms-2">
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditMessageId(null)}
                                      className="btn btn-secondary ms-2"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div
                                    className={`message-content p-3 mb-2 ${
                                      msg.sender._id === userId ? 'bg-primary' : 'bg-body-tertiary'
                                    }`}
                                  >
                                    {msg.isVoice ? (
                                      <>
                                        <span>Voice Message</span>
                                        <button
                                          onClick={() => playVoiceMessage(msg.voiceMessage)}
                                          className="play-voice-button"
                                        >
                                          <i className="fas fa-play"></i>
                                        </button>
                                      </>
                                    ) : msg.isQuestionnaireLink ? (
                                      <>
                                        <span>Click to take the depression score questionnaire</span>
                                        {userRole === 'student' && (
                                          <button
                                            onClick={() => setShowQuestionnaireModal(true)}
                                            className="questionnaire-link"
                                            title="Take Questionnaire"
                                          >
                                            <i className="fas fa-clipboard-list"></i>
                                          </button>
                                        )}
                                      </>
                                    ) : msg.isDepressionQuestion && userRole === 'student' ? (
                                      <>
                                        <span>{msg.message}</span>
                                        <div className="response-buttons">
                                          <button onClick={handleYesClick} className="yes-button">
                                            Yes
                                          </button>
                                          <button onClick={handleNoClick} className="no-button">
                                            No
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        {msg.message}
                                        <button
                                          onClick={() => speakMessage(msg.message)}
                                          className="play-voice-button"
                                          title="Speak Message"
                                        >
                                          <i className="fas fa-volume-up"></i>
                                        </button>
                                      </>
                                    )}
                                    {msg.sender._id === userId && !msg.isVoice && !msg.isQuestionnaireLink && !msg.isDepressionQuestion && (
                                      <div className="dropdown">
                                        <button
                                          className="btn btn-link dropdown-toggle"
                                          type="button"
                                          onClick={() => toggleDropdown(msg._id)}
                                        >
                                          <i className="fas fa-ellipsis-v"></i>
                                        </button>
                                        {activeDropdown === msg._id && (
                                          <div
                                            className="dropdown-menu dropdown-menu-end show"
                                            style={{ position: 'absolute' }}
                                          >
                                            <button
                                              className="dropdown-item"
                                              onClick={() => startEditing(msg._id, msg.message)}
                                            >
                                              Edit
                                            </button>
                                            <button
                                              className="dropdown-item"
                                              onClick={() => deleteMessage(msg._id)}
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {!msg.isVoice && !msg.isQuestionnaireLink && !msg.isDepressionQuestion && (
                                      <button
                                        onClick={() => handleTranslate(msg._id, msg.message)}
                                        className="translate-button"
                                        title="Translate Message"
                                      >
                                        <i className="fas fa-language"></i>
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div className="timestamp">
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </div>
                                {translatedMessages[msg._id] && (
                                  <div className="translated-text">
                                    {translatedMessages[msg._id].text}
                                  </div>
                                )}
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
                                    alt={msg.sender.username || 'User'}
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
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="card-footer">
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="language-select"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleMessageKeyPress}
                        placeholder="Type a message..."
                        className="form-control"
                      />
                      <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="emoji-button ms-2"
                        title="Toggle Emoji Picker"
                      >
                        <i className="fas fa-smile"></i>
                      </button>
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className="voice-button ms-2"
                        title={isRecording ? 'Stop Recording' : 'Record Voice'}
                        disabled={isRecording && mediaRecorderRef.current?.state !== 'recording'}
                      >
                        <i className={isRecording ? 'fas fa-stop' : 'fas fa-microphone'}></i>
                      </button>
                      <button onClick={sendMessage} className="send-button ms-2" title="Send Message">
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
      {showVideoCall && (
        <div className="video-call-modal">
          <div className="video-call-content">
            <button onClick={closeVideoChat} className="close-video-call">
              Close
            </button>
            <VideoChat roomCode={joinedRoom} userId={userId} />
          </div>
        </div>
      )}
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
      {showQuestionnaireModal && (
        <div className="questionnaire-modal">
          <div className="questionnaire-content">
            <button
              onClick={() => setShowQuestionnaireModal(false)}
              className="close-questionnaire"
            >
              Close
            </button>
            <h5>Depression Score Questionnaire</h5>
            <div className="questionnaire-form">
              {questions.map((question) => (
                <div key={question.id}>
                  <label>{question.text}</label>
                  <select
                    value={questionnaireResponses[question.id]}
                    onChange={(e) =>
                      setQuestionnaireResponses({
                        ...questionnaireResponses,
                        [question.id]: parseInt(e.target.value),
                      })
                    }
                  >
                    <option value={0}>Not at all</option>
                    <option value={1}>Several days</option>
                    <option value={2}>More than half the days</option>
                    <option value={3}>Nearly every day</option>
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={handleQuestionnaireSubmit}
              className="btn btn-primary"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default Chat;