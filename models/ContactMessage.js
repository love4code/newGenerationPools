const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  town: {
    type: String,
    trim: true
  },
  serviceType: {
    type: String,
    enum: ['New pool', 'pool install', 'pool replacement', 'pool removal'],
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);

