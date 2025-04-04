import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import Header from '../../components/Header';
import { tokens } from '../../theme';

const Chat = () => {
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    const storedToken = localStorage.getItem('jwt-token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setError('Please log in.');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllRooms();
    }
  }, [token]);

  const fetchAllRooms = async () => {
    try {
      const response = await axios.get('http://localhost:5000/users/users/chat/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(response.data || {});
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Unable to load messages.');
      setLoading(false);
    }
  };

  const filteredRooms = Object.entries(rooms).filter(([_, { participants }]) =>
    participants.some((p) =>
      p.username?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  if (!token) {
    return (
      <Box m="20px">
        <Header title="Chat History" subtitle="View your conversation history" />
        <Box
          backgroundColor={colors.primary[400]}
          p={3}
          borderRadius="8px"
          textAlign="center"
        >
          <Typography color={colors.redAccent[400]} fontSize="18px">
            You need to be logged in to view the conversations.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box m="20px">
      <Header title="Chat History" subtitle="All your previous conversations" />

      {/* Filters */}
      <Box mb={2} display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
        {/* Search */}
        <TextField
          size="small"
          variant="outlined"
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {/* Sort */}
        <FormControl variant="outlined" size="small">
          <InputLabel><SortIcon sx={{ mr: 1 }} /> Sort</InputLabel>
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            label="Sort"
          >
            <MenuItem value="desc">Most Recent First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box
        backgroundColor={colors.primary[400]}
        p={3}
        borderRadius="8px"
        maxHeight="70vh"
        overflow="auto"
      >
        {loading ? (
          <Typography textAlign="center" color={colors.grey[300]}>
            Loading conversations...
          </Typography>
        ) : error ? (
          <Typography textAlign="center" color={colors.redAccent[400]}>
            {error}
          </Typography>
        ) : filteredRooms.length === 0 ? (
          <Typography textAlign="center" color={colors.grey[300]}>
            No conversations found.
          </Typography>
        ) : (
          filteredRooms
            .sort(([, roomA], [, roomB]) => {
              const getDate = (room) => {
                if (!room.messages.length) return new Date(0);
                const sortedMsgs = [...room.messages].sort((a, b) =>
                  sortOrder === 'asc'
                    ? new Date(a.createdAt) - new Date(b.createdAt)
                    : new Date(b.createdAt) - new Date(a.createdAt)
                );
                return new Date(sortedMsgs[0].createdAt);
              };
              const dateA = getDate(roomA);
              const dateB = getDate(roomB);
              return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            })
            .map(([roomCode, { messages, participants }]) => (
              <Box
                key={roomCode}
                backgroundColor={colors.primary[600]}
                borderRadius="12px"
                p={2}
                mb={3}
                boxShadow="0 2px 10px rgba(0,0,0,0.2)"
              >
                <Typography color={colors.blueAccent[300]} fontSize="18px" fontWeight="bold" mb={1}>
                  Room Code: {roomCode}
                </Typography>
                <Typography fontSize="14px" color={colors.grey[300]} mb={2}>
                  Participants: {participants.map((p) => p.username || 'Unknown').join(', ')}
                </Typography>

                {messages.length === 0 ? (
                  <Typography color={colors.grey[300]}>No messages in this room.</Typography>
                ) : (
                  messages.map((msg) => (
                    <Box
                      key={msg._id}
                      backgroundColor={colors.primary[500]}
                      borderRadius="8px"
                      p={2}
                      mb={1}
                    >
                      <Typography fontWeight="bold" color={colors.greenAccent[400]}>
                        {
                          participants.find(
                            p => p._id === (msg.sender?._id || msg.sender)
                          )?.username || 'Unknown'
                        }
                      </Typography>
                      <Typography color={colors.grey[200]} mt={0.5}>
                        🔒 Encrypted: {msg.encryptedMessage}
                      </Typography>
                      <Typography fontSize="12px" color={colors.grey[400]} mt={1}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            ))
        )}
      </Box>
    </Box>
  );
};

export default Chat;
