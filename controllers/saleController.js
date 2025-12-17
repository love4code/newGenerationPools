const Sale = require('../models/Sale')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const GlobalSettings = require('../models/GlobalSettings')

// List all sales with filters
exports.list = async (req, res) => {
  try {
    const { dateFrom, dateTo, status, paymentStatus, customerId, search } =
      req.query
    const query = {}

    if (dateFrom || dateTo) {
      query.saleDate = {}
      if (dateFrom) {
        query.saleDate.$gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        query.saleDate.$lte = endDate
      }
    }

    if (status) query.status = status
    if (paymentStatus) query.paymentStatus = paymentStatus
    if (customerId) query.customer = customerId

    const sales = await Sale.find(query)
      .populate('customer', 'name email phone')
      .sort({ saleDate: -1, createdAt: -1 })
      .limit(100)

    const customers = await Customer.find({ status: 'active' })
      .sort({ name: 1 })
      .select('name')

    res.render('admin/sales/list', {
      title: 'Sales',
      sales,
      customers,
      filters: { dateFrom, dateTo, status, paymentStatus, customerId, search }
    })
  } catch (error) {
    console.error('Sales list error:', error)
    req.flash('error', 'Failed to load sales')
    res.redirect('/admin')
  }
}

// Show create form for a customer
exports.createForm = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.customerId)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/admin/customers')
    }

    const products = await Product.find({ isActive: true })
      .sort({ name: 1 })
      .select('name sku price costPrice taxable description')

    // Get default tax rate from settings
    const settings = await GlobalSettings.getSettings()
    const defaultTaxRate = settings.salesTaxRate || 0.0625

    res.render('admin/sales/form', {
      title: `New Sale - ${customer.name}`,
      sale: null,
      customer,
      products,
      defaultTaxRate
    })
  } catch (error) {
    console.error('Create sale form error:', error)
    req.flash('error', 'Failed to load form')
    res.redirect('/admin/customers')
  }
}

// Create sale
exports.create = async (req, res) => {
  try {
    const customerId = req.body.customerId || req.params.customerId
    const { saleDate, status, paymentStatus, taxRate, notes, lineItems } =
      req.body

    const customer = await Customer.findById(customerId)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/admin/customers')
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      req.flash('error', 'At least one line item is required')
      return res.redirect(`/admin/customers/${customerId}/sales/new`)
    }

    // Get default tax rate from settings
    const settings = await GlobalSettings.getSettings()
    const defaultTaxRate = settings.salesTaxRate || 0.0625

    // Process line items
    const processedLineItems = []
    for (const item of lineItems) {
      if (!item.name || !item.unitPrice || !item.quantity) {
        continue // Skip invalid items
      }

      // Get cost price from product if productId exists
      let unitCost = 0
      if (item.productId) {
        const product = await Product.findById(item.productId)
        if (product) {
          unitCost = product.costPrice || 0
        }
      }
      // Allow manual override if provided
      if (
        item.unitCost !== undefined &&
        item.unitCost !== null &&
        item.unitCost !== ''
      ) {
        unitCost = parseFloat(item.unitCost) || 0
      }

      const lineItem = {
        productId: item.productId || null,
        name: item.name.trim(),
        sku: item.sku ? item.sku.trim() : '',
        description: item.description ? item.description.trim() : '',
        taxable: item.taxable === 'true' || item.taxable === true,
        unitPrice: Math.max(0, parseFloat(item.unitPrice) || 0),
        unitCost: Math.max(0, unitCost),
        quantity: Math.max(1, parseInt(item.quantity) || 1)
      }

      processedLineItems.push(lineItem)
    }

    if (processedLineItems.length === 0) {
      req.flash('error', 'At least one valid line item is required')
      return res.redirect(`/admin/customers/${customerId}/sales/new`)
    }

    const saleData = {
      customer: customerId,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      status: status || 'open',
      paymentStatus: paymentStatus || 'unpaid',
      taxRate: Math.max(0, Math.min(1, parseFloat(taxRate) || defaultTaxRate)),
      notes: notes ? notes.trim() : '',
      lineItems: processedLineItems
    }

    const sale = new Sale(saleData)
    // Calculate totals (will be done in pre-validate hook, but ensure it's done)
    sale.calculateTotals()
    await sale.save()

    req.flash('success', 'Sale created successfully')
    res.redirect(`/admin/sales/${sale._id}`)
  } catch (error) {
    console.error('Create sale error:', error)
    req.flash('error', error.message || 'Failed to create sale')
    res.redirect(`/admin/customers/${req.body.customerId}/sales/new`)
  }
}

// Show sale detail
exports.show = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('customer')
      .populate('lineItems.productId', 'name sku')

    if (!sale) {
      req.flash('error', 'Sale not found')
      return res.redirect('/admin/sales')
    }

    res.render('admin/sales/show', {
      title: `Sale #${sale._id.toString().slice(-8)}`,
      sale
    })
  } catch (error) {
    console.error('Show sale error:', error)
    req.flash('error', 'Failed to load sale')
    res.redirect('/admin/sales')
  }
}

// Show edit form
exports.editForm = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer')
    if (!sale) {
      req.flash('error', 'Sale not found')
      return res.redirect('/admin/sales')
    }

    const products = await Product.find({ isActive: true })
      .sort({ name: 1 })
      .select('name sku price costPrice taxable description')

    // Get default tax rate from settings
    const settings = await GlobalSettings.getSettings()
    const defaultTaxRate = settings.salesTaxRate || 0.0625

    res.render('admin/sales/form', {
      title: `Edit Sale - ${sale.customer.name}`,
      sale,
      customer: sale.customer,
      products,
      defaultTaxRate
    })
  } catch (error) {
    console.error('Edit sale form error:', error)
    req.flash('error', 'Failed to load sale')
    res.redirect('/admin/sales')
  }
}

// Update sale
exports.update = async (req, res) => {
  try {
    const { saleDate, status, paymentStatus, taxRate, notes, lineItems } =
      req.body

    const sale = await Sale.findById(req.params.id)
    if (!sale) {
      req.flash('error', 'Sale not found')
      return res.redirect('/admin/sales')
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      req.flash('error', 'At least one line item is required')
      return res.redirect(`/admin/sales/${req.params.id}/edit`)
    }

    // Get default tax rate from settings
    const settings = await GlobalSettings.getSettings()
    const defaultTaxRate = settings.salesTaxRate || 0.0625

    // Process line items
    const processedLineItems = []
    for (const item of lineItems) {
      if (!item.name || !item.unitPrice || !item.quantity) {
        continue
      }

      // Get cost price from product if productId exists
      let unitCost = 0
      if (item.productId) {
        const product = await Product.findById(item.productId)
        if (product) {
          unitCost = product.costPrice || 0
        }
      }
      // Allow manual override if provided
      if (
        item.unitCost !== undefined &&
        item.unitCost !== null &&
        item.unitCost !== ''
      ) {
        unitCost = parseFloat(item.unitCost) || 0
      }

      const lineItem = {
        productId: item.productId || null,
        name: item.name.trim(),
        sku: item.sku ? item.sku.trim() : '',
        description: item.description ? item.description.trim() : '',
        taxable: item.taxable === 'true' || item.taxable === true,
        unitPrice: Math.max(0, parseFloat(item.unitPrice) || 0),
        unitCost: Math.max(0, unitCost),
        quantity: Math.max(1, parseInt(item.quantity) || 1)
      }

      processedLineItems.push(lineItem)
    }

    if (processedLineItems.length === 0) {
      req.flash('error', 'At least one valid line item is required')
      return res.redirect(`/admin/sales/${req.params.id}/edit`)
    }

    sale.saleDate = saleDate ? new Date(saleDate) : sale.saleDate
    sale.status = status || sale.status
    sale.paymentStatus = paymentStatus || sale.paymentStatus
    sale.taxRate = Math.max(
      0,
      Math.min(1, parseFloat(taxRate) || defaultTaxRate)
    )
    sale.notes = notes ? notes.trim() : ''
    sale.lineItems = processedLineItems

    // Recalculate totals
    sale.calculateTotals()
    await sale.save()

    req.flash('success', 'Sale updated successfully')
    res.redirect(`/admin/sales/${sale._id}`)
  } catch (error) {
    console.error('Update sale error:', error)
    req.flash('error', error.message || 'Failed to update sale')
    res.redirect(`/admin/sales/${req.params.id}/edit`)
  }
}

// Delete/Cancel sale
exports.delete = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
    if (!sale) {
      req.flash('error', 'Sale not found')
      return res.redirect('/admin/sales')
    }

    // Set status to cancelled instead of deleting
    sale.status = 'cancelled'
    await sale.save()

    req.flash('success', 'Sale cancelled successfully')
    res.redirect('/admin/sales')
  } catch (error) {
    console.error('Delete sale error:', error)
    req.flash('error', 'Failed to cancel sale')
    res.redirect('/admin/sales')
  }
}
