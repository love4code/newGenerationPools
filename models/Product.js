const mongoose = require('mongoose')
const slugify = require('slugify')

const productSchema = new mongoose.Schema({
  name: {
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
  sku: {
    type: String,
    trim: true,
    sparse: true, // Allows multiple nulls but enforces uniqueness for non-null values
    unique: true
  },
  price: {
    type: Number,
    default: 0
  },
  taxable: {
    type: Boolean,
    default: true
  },
  images: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image'
    }
  ],
  featuredImage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image'
  },
  category: {
    type: String,
    default: 'general'
  },
  sizes: [
    {
      type: String,
      trim: true
    }
  ],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
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
  seoKeywords: [
    {
      type: String
    }
  ],
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
})

// Auto-generate slug from name
productSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, { lower: true, strict: true })
  }
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Product', productSchema)
