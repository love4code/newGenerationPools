const Customer = require('../models/Customer')
const Sale = require('../models/Sale')

// List all customers with search
exports.list = async (req, res) => {
  try {
    const search = req.query.search || ''
    const query = {}

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 })

    res.render('admin/customers/list', {
      title: 'Customers',
      customers,
      search
    })
  } catch (error) {
    console.error('Customers list error:', error)
    req.flash('error', 'Failed to load customers')
    res.redirect('/admin')
  }
}

// Show create form
exports.createForm = async (req, res) => {
  try {
    res.render('admin/customers/form', {
      title: 'Create Customer',
      customer: null
    })
  } catch (error) {
    console.error('Create form error:', error)
    res.status(500).render('admin/error', { error: 'Failed to load form' })
  }
}

// Create customer
exports.create = async (req, res) => {
  try {
    const { name, email, phone, street, city, state, zip, notes, status } =
      req.body

    if (!name || !name.trim()) {
      req.flash('error', 'Name is required')
      return res.render('admin/customers/form', {
        title: 'Create Customer',
        customer: null,
        formData: req.body
      })
    }

    const customerData = {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      phone: phone ? phone.trim() : '',
      address: {
        street: street ? street.trim() : '',
        city: city ? city.trim() : '',
        state: state ? state.trim() : '',
        zip: zip ? zip.trim() : ''
      },
      notes: notes ? notes.trim() : '',
      status: status || 'active'
    }

    const customer = new Customer(customerData)
    await customer.save()

    req.flash('success', 'Customer created successfully')
    res.redirect('/admin/customers')
  } catch (error) {
    console.error('Create customer error:', error)
    req.flash('error', error.message || 'Failed to create customer')
    res.render('admin/customers/form', {
      title: 'Create Customer',
      customer: null,
      formData: req.body
    })
  }
}

// Show customer detail
exports.show = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/admin/customers')
    }

    const sales = await Sale.find({ customer: customer._id })
      .sort({ saleDate: -1, createdAt: -1 })
      .limit(20)

    res.render('admin/customers/show', {
      title: `Customer: ${customer.name}`,
      customer,
      sales
    })
  } catch (error) {
    console.error('Show customer error:', error)
    req.flash('error', 'Failed to load customer')
    res.redirect('/admin/customers')
  }
}

// Show edit form
exports.editForm = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/admin/customers')
    }

    res.render('admin/customers/form', {
      title: 'Edit Customer',
      customer
    })
  } catch (error) {
    console.error('Edit form error:', error)
    req.flash('error', 'Failed to load customer')
    res.redirect('/admin/customers')
  }
}

// Update customer
exports.update = async (req, res) => {
  try {
    const { name, email, phone, street, city, state, zip, notes, status } =
      req.body

    if (!name || !name.trim()) {
      req.flash('error', 'Name is required')
      return res.redirect(`/admin/customers/${req.params.id}/edit`)
    }

    const customerData = {
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      phone: phone ? phone.trim() : '',
      address: {
        street: street ? street.trim() : '',
        city: city ? city.trim() : '',
        state: state ? state.trim() : '',
        zip: zip ? zip.trim() : ''
      },
      notes: notes ? notes.trim() : '',
      status: status || 'active'
    }

    await Customer.findByIdAndUpdate(req.params.id, customerData)

    req.flash('success', 'Customer updated successfully')
    res.redirect(`/admin/customers/${req.params.id}`)
  } catch (error) {
    console.error('Update customer error:', error)
    req.flash('error', 'Failed to update customer')
    res.redirect(`/admin/customers/${req.params.id}/edit`)
  }
}

// Delete customer
exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      req.flash('error', 'Customer not found')
      return res.redirect('/admin/customers')
    }

    // Check if customer has sales
    const salesCount = await Sale.countDocuments({ customer: customer._id })
    if (salesCount > 0) {
      req.flash(
        'error',
        `Cannot delete customer with ${salesCount} sale(s). Set status to inactive instead.`
      )
      return res.redirect(`/admin/customers/${req.params.id}`)
    }

    await Customer.findByIdAndDelete(req.params.id)
    req.flash('success', 'Customer deleted successfully')
    res.redirect('/admin/customers')
  } catch (error) {
    console.error('Delete customer error:', error)
    req.flash('error', 'Failed to delete customer')
    res.redirect('/admin/customers')
  }
}
