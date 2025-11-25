const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  // Store image data as Buffers
  originalData: {
    type: Buffer,
    required: true
  },
  thumbnailData: {
    type: Buffer,
    required: true
  },
  mediumData: {
    type: Buffer,
    required: true
  },
  largeData: {
    type: Buffer,
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

// Virtual properties for backward compatibility with path-based access
imageSchema.virtual('originalPath').get(function() {
  return `/api/images/${this._id}/original`;
});

imageSchema.virtual('thumbnailPath').get(function() {
  return `/api/images/${this._id}/thumbnail`;
});

imageSchema.virtual('mediumPath').get(function() {
  return `/api/images/${this._id}/medium`;
});

imageSchema.virtual('largePath').get(function() {
  return `/api/images/${this._id}/large`;
});

// Ensure virtuals are included in JSON
imageSchema.set('toJSON', { virtuals: true });
imageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Image', imageSchema);

