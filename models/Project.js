const mongoose = require('mongoose');
const slugify = require('slugify');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    required: true
  },
  shortDescription: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  }],
  featuredImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  showInPortfolio: {
    type: Boolean,
    default: true
  },
  // SEO fields
  seoTitle: {
    type: String,
    trim: true
  },
  seoDescription: {
    type: String,
    trim: true
  },
  seoKeywords: [{
    type: String
  }],
  seoCanonicalUrl: {
    type: String,
    trim: true
  },
  seoIndex: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-generate slug from title
projectSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);

