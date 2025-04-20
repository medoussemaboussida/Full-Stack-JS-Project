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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import SortIcon from '@mui/icons-material/Sort';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
          boxShadow={3}
        >
          <Typography
            color={colors.redAccent[400]}
            fontSize="18px"
            fontWeight="600"
          >
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
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Search by username..."
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.grey[400] }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            label="Sort By"
          >
            <MenuItem value="desc">Most Recent First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box
        mt={4}
        sx={{
          maxHeight: "430px",
          overflowY: "auto",
          padding: "10px",
          border: `1px solid ${colors.grey[700]}`,
          borderRadius: "8px",
          backgroundColor: colors.primary[500],
        }}
      >
        {loading ? (
          <Typography
            textAlign="center"
            color={colors.grey[100]}
            fontWeight="500"
          >
            Loading conversations...
          </Typography>
        ) : error ? (
          <Typography
            textAlign="center"
            color={colors.redAccent[400]}
            fontWeight="500"
          >
            {error}
          </Typography>
        ) : filteredRooms.length === 0 ? (
          <Typography
            textAlign="center"
            color={colors.grey[100]}
            fontWeight="500"
          >
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
              <Accordion
                key={roomCode}
                sx={{
                  backgroundColor: colors.primary[400],
                  borderRadius: '8px !important',
                  mb: 2,
                  boxShadow: 3,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <IconButton sx={{ color: colors.grey[400] }}>
                      <ExpandMoreIcon />
                    </IconButton>
                  }
                  aria-controls={`panel-${roomCode}-content`}
                  id={`panel-${roomCode}-header`}
                  sx={{
                    borderRadius: '8px',
                    py: 2,
                    px: 3,
                  }}
                >
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography variant="h4" color={colors.grey[100]}>
                        <strong>Room Code: </strong> {roomCode}
                      </Typography>
                    </Box>
                    <br />
                    <Typography variant="h5" color={colors.grey[100]}>
                      <strong>Participants: </strong>
                      <span
                        style={{
                          backgroundColor: "transparent",
                          border: `1px solid #00C4B4`,
                          color: `#00C4B4`,
                          padding: "2px 8px",
                          borderRadius: "20px",
                          boxShadow: theme.palette.mode === 'dark' ? "0 0 10px rgba(0, 196, 180, 0.5)" : "0 0 10px rgba(0, 196, 180, 0.3)",
                          fontSize: "0.875rem",
                          marginLeft: "8px",
                        }}
                      >
                        {participants.map((p) => p.username || 'Unknown').join(', ')}
                      </span>
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pb: 3 }}>
                  {messages.length === 0 ? (
                    <Typography color={colors.grey[100]} variant="body2">
                      No messages in this room.
                    </Typography>
                  ) : (
                    messages.map((msg) => (
                      <Box
                        key={msg._id}
                        bgcolor={colors.primary[400]}
                        p={2}
                        borderRadius={2}
                        mb={2}
                        boxShadow={3}
                        sx={{ maxHeight: 100, overflowY: "auto" }}
                      >
                        <Typography variant="h6" color={colors.grey[100]}>
                          <strong>
                            {
                              participants.find(
                                p => p._id === (msg.sender?._id || msg.sender)
                              )?.username || 'Unknown'
                            }
                          </strong>
                        </Typography>
                        <Typography variant="body1" color={colors.grey[100]} mt={0.5}>
                          🔒 Encrypted: {msg.encryptedMessage}
                        </Typography>
                        <Typography variant="caption" color={colors.grey[400]} mt={1}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    ))
                  )}
                </AccordionDetails>
              </Accordion>
            ))
        )}
      </Box>
    </Box>
  );
};

export default Chat;