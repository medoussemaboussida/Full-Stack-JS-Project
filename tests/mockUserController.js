// Mock implementation of userController methods for testing
const { mockDb } = require('./mockMongoDb');
const mongoose = require('mongoose');

// Mock implementation of getAllchat
const getAllchat = async (req, res) => {
  try {
    // Get unique room codes
    const roomCodes = [...new Set(mockDb.chats.map(chat => chat.roomCode))];
    
    // Create room objects
    const rooms = roomCodes.map(roomCode => {
      const roomMessages = mockDb.chats.filter(chat => chat.roomCode === roomCode);
      const participantIds = [...new Set(roomMessages.map(msg => msg.sender.toString()))];
      const participants = participantIds.map(id => {
        const user = mockDb.users.find(user => user._id.toString() === id);
        return user ? {
          _id: user._id,
          username: user.username,
          user_photo: user.user_photo
        } : { _id: id, username: 'Unknown', user_photo: null };
      });
      
      return {
        roomCode,
        messages: roomMessages,
        participants
      };
    });
    
    res.status(200).json(rooms);
  } catch (err) {
    console.error('Error in mock getAllchat:', err);
    res.status(500).json({ message: 'Failed to fetch chat rooms', error: err.message });
  }
};

// Export the mock methods
module.exports = {
  getAllchat
};
