const mongoose = require('mongoose')

const globalSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'New Generation Pools'
    },
    defaultMetaTitle: {
      type: String,
      default: 'New Generation Pools - Premium Pool Services'
    },
    defaultMetaDescription: {
      type: String,
      default:
        'New Generation Pools offers premium pool design, installation, and maintenance services.'
    },
    defaultOpenGraphImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image'
    },
    contactEmail: {
      type: String,
      default: 'contact@newgenerationpools.com'
    },
    contactPhone: {
      type: String,
      default: ''
    },
    salesTaxRate: {
      type: Number,
      default: 0.0625, // 6.25% default
      min: 0,
      max: 1
    },
    socialLinks: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String
    },
    // Company Information
    companyName: {
      type: String,
      default: 'New Generation Pools'
    },
    companyAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String
    },
    // Theme Settings
    theme: {
      preset: {
        type: String,
        enum: ['default', 'ocean', 'sky', 'navy', 'teal', 'custom'],
        default: 'default'
      },
      primaryColor: {
        type: String,
        default: '#0d6efd' // Bootstrap primary blue
      },
      secondaryColor: {
        type: String,
        default: '#6c757d' // Bootstrap secondary gray
      },
      navbarColor: {
        type: String,
        default: '#212529' // Dark
      },
      footerColor: {
        type: String,
        default: '#2c3e50' // Dark blue-gray
      },
      fontFamily: {
        type: String,
        default: 'system-ui, -apple-system, sans-serif'
      }
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    // Ensure only one settings document exists
    collection: 'globalsettings'
  }
)

// Static method to get or create settings
globalSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne()
  if (!settings) {
    settings = await this.create({})
  }
  return settings
}

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema)
