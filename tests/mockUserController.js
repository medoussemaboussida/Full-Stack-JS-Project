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

// Mock implementation of getAppointmentsByPsychiatrist
const getAppointmentsByPsychiatrist = async (req, res) => {
  try {
    const { psychiatristId } = req.params;

    // Validate psychiatristId
    if (!psychiatristId) {
      return res.status(400).json({ message: 'Psychiatrist ID is required' });
    }

    if (psychiatristId === 'invalid') {
      return res.status(400).json({ message: 'Invalid psychiatrist ID' });
    }

    // Get appointments for the psychiatrist
    const appointments = mockDb.appointments.filter(appointment =>
      appointment.psychiatrist && appointment.psychiatrist.toString() === psychiatristId.toString()
    );

    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid psychiatrist ID' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mock implementation of getAllAppointments
const getAllAppointments = async (req, res) => {
  try {
    res.status(200).json(mockDb.appointments);
  } catch (error) {
    console.error('Error fetching all appointments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mock implementation of getUserById
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = mockDb.users.find(user => user._id.toString() === id.toString());

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mock implementation of getPsychiatristById
const getPsychiatristById = async (req, res) => {
  try {
    const { id } = req.params;
    const psychiatrist = mockDb.users.find(user =>
      user._id.toString() === id.toString() && user.role === 'psychiatrist'
    );

    if (!psychiatrist) {
      return res.status(404).json({ message: 'Psychiatrist not found' });
    }

    res.status(200).json(psychiatrist);
  } catch (error) {
    console.error('Error fetching psychiatrist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mock implementation of RoomChat
const RoomChat = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode) {
      return res.status(400).json({ message: 'roomCode is required' });
    }

    const messages = mockDb.chats.filter(chat => chat.roomCode === roomCode);

    // Populate sender information
    const messagesWithSender = messages.map(message => {
      const sender = mockDb.users.find(user =>
        user._id.toString() === message.sender.toString()
      );

      return {
        ...message,
        sender: sender ? {
          _id: sender._id,
          username: sender.username,
          user_photo: sender.user_photo
        } : message.sender
      };
    });

    res.status(200).json(messagesWithSender);
  } catch (err) {
    console.error('Error retrieving messages:', err);
    res.status(500).json({ message: 'Failed to retrieve messages', error: err.message });
  }
};

// Mock implementation of updateUser
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = mockDb.users.find(user => user._id.toString() === id.toString());

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Update user with request body
    Object.assign(user, req.body);

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mock implementation of verifyUser
const verifyUser = async (req, res) => {
  try {
    const { token } = req.params;

    // Simulate JWT verification failure
    if (token === 'invalidtoken') {
      return res.status(400).json({ message: 'Lien de validation invalide ou expiré.' });
    }

    // Simulate successful verification
    res.status(200).json({ message: 'Compte activé avec succès.' });
  } catch (error) {
    res.status(400).json({ message: 'Lien de validation invalide ou expiré.' });
  }
};

// Export the mock methods
module.exports = {
  getAllchat,
  getAppointmentsByPsychiatrist,
  getAllAppointments,
  getUserById,
  getPsychiatristById,
  RoomChat,
  updateUser,
  verifyUser
};
