const mongoose = require('mongoose')

// SaleLineItem subdocument schema
const saleLineItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    taxable: {
      type: Boolean,
      default: true
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    lineSubtotal: {
      type: Number,
      default: 0
    },
    lineTax: {
      type: Number,
      default: 0
    },
    lineTotal: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
)

// Main Sale schema
const saleSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  saleDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'paid', 'cancelled'],
    default: 'open'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  notes: {
    type: String,
    trim: true
  },
  taxRate: {
    type: Number,
    default: 0.0625, // 6.25% default
    min: 0,
    max: 1
  },
  lineItems: [saleLineItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  taxTotal: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
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

// Calculate totals before save
saleSchema.pre('validate', function (next) {
  this.calculateTotals()
  next()
})

// Method to calculate all totals
saleSchema.methods.calculateTotals = function () {
  let subtotal = 0
  let taxTotal = 0

  // Calculate line item totals
  this.lineItems.forEach(item => {
    // Line subtotal
    item.lineSubtotal = item.unitPrice * item.quantity

    // Line tax (only if taxable)
    item.lineTax = item.taxable ? item.lineSubtotal * this.taxRate : 0

    // Line total
    item.lineTotal = item.lineSubtotal + item.lineTax

    // Add to sale totals
    subtotal += item.lineSubtotal
    taxTotal += item.lineTax
  })

  // Round to 2 decimal places
  this.subtotal = Math.round(subtotal * 100) / 100
  this.taxTotal = Math.round(taxTotal * 100) / 100
  this.total = Math.round((subtotal + taxTotal) * 100) / 100

  // Update updatedAt
  this.updatedAt = Date.now()
}

// Update updatedAt on save
saleSchema.pre('save', function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model('Sale', saleSchema)
