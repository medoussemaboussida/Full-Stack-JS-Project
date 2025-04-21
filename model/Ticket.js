const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isPartner: {
    type: Boolean,
    default: false,
  },
  userDetails: {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value) {
          return /^[a-zA-Z0-9._%+-]+@esprit\.tn$/.test(value);
        },
        message: 'Email must end with @esprit.tn',
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Indexes for efficient querying
ticketSchema.index({ ticketId: 1 }, { unique: true });
ticketSchema.index({ eventId: 1 });
ticketSchema.index({ userId: 1 });

// Middleware to log ticket creation
ticketSchema.post('save', function (doc) {
  console.log(`✅ Ticket ${doc.ticketId} created for user ${doc.userDetails.username} in event ${doc.eventId}`);
});

// Validate references before saving
ticketSchema.pre('save', async function (next) {
  try {
    const [event, user] = await Promise.all([
      mongoose.model('Event').findById(this.eventId),
      mongoose.model('User').findById(this.userId),
    ]);

    if (!event) {
      return next(new Error('Referenced event does not exist'));
    }
    if (!user) {
      return next(new Error('Referenced user does not exist'));
    }

    // Ensure userDetails match the user
    if (this.userDetails.username !== user.username || this.userDetails.email !== user.email) {
      return next(new Error('User details do not match the referenced user'));
    }

    next();
  } catch (error) {
    next(error);
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
module.exports = Ticket;