const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalPath: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String,
    required: true
  },
  mediumPath: {
    type: String,
    required: true
  },
  largePath: {
    type: String,
    required: true
  },
  altText: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['project', 'service', 'hero', 'portfolio', 'general'],
    default: 'general'
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Image', imageSchema);

