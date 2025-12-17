const ContactMessage = require('../models/ContactMessage')

// List all contact messages
exports.list = async (req, res) => {
  try {
    const contactMessages = await ContactMessage.find().sort({ createdAt: -1 })

    res.render('admin/contacts/list', {
      title: 'Recent Contacts',
      contactMessages
    })
  } catch (error) {
    console.error('Contact messages list error:', error)
    res
      .status(500)
      .render('admin/error', { error: 'Failed to load contact messages' })
  }
}

// Show contact message detail
exports.show = async (req, res) => {
  try {
    const contactMessage = await ContactMessage.findById(req.params.id)
    if (!contactMessage) {
      req.flash('error', 'Contact message not found')
      return res.redirect('/admin/contacts')
    }

    // Mark as read when viewed
    if (!contactMessage.isRead) {
      contactMessage.isRead = true
      await contactMessage.save()
    }

    res.render('admin/contacts/show', {
      title: `Contact from ${contactMessage.name}`,
      contactMessage
    })
  } catch (error) {
    console.error('Contact message show error:', error)
    req.flash('error', 'Failed to load contact message')
    res.redirect('/admin/contacts')
  }
}

// Delete contact message
exports.delete = async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id)
    req.flash('success', 'Contact message deleted successfully')
    res.redirect('/admin/contacts')
  } catch (error) {
    console.error('Delete contact message error:', error)
    req.flash('error', 'Failed to delete contact message')
    res.redirect('/admin/contacts')
  }
}
