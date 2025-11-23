const Service = require('../models/Service');
const Image = require('../models/Image');

// List all services
exports.list = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('iconImage heroImage')
      .sort({ displayOrder: 1, createdAt: -1 });
    res.render('admin/services/list', { title: 'Services', services });
  } catch (error) {
    console.error('Services list error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load services' });
  }
};

// Show create form
exports.createForm = async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.render('admin/services/form', { title: 'Create Service', service: null, images });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load form' });
  }
};

// Create service
exports.create = async (req, res) => {
  try {
    const { name, shortDescription, description, iconImage, heroImage, displayOrder, isActive, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    const serviceData = {
      name,
      shortDescription,
      description,
      displayOrder: parseInt(displayOrder) || 0,
      isActive: isActive === 'on',
      seoTitle,
      seoDescription,
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [],
      seoCanonicalUrl,
      seoIndex: seoIndex !== 'false'
    };

    if (iconImage) serviceData.iconImage = iconImage;
    if (heroImage) serviceData.heroImage = heroImage;

    const service = new Service(serviceData);
    await service.save();
    
    req.flash('success', 'Service created successfully');
    res.redirect('/admin/services');
  } catch (error) {
    console.error('Create service error:', error);
    req.flash('error', 'Failed to create service');
    res.redirect('/admin/services/new');
  }
};

// Show edit form
exports.editForm = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('iconImage heroImage');
    const images = await Image.find().sort({ createdAt: -1 });
    res.render('admin/services/form', { title: 'Edit Service', service, images });
  } catch (error) {
    console.error('Edit form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load service' });
  }
};

// Update service
exports.update = async (req, res) => {
  try {
    const { name, shortDescription, description, iconImage, heroImage, displayOrder, isActive, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    const serviceData = {
      name,
      shortDescription,
      description,
      displayOrder: parseInt(displayOrder) || 0,
      isActive: isActive === 'on',
      seoTitle,
      seoDescription,
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [],
      seoCanonicalUrl,
      seoIndex: seoIndex !== 'false'
    };

    if (iconImage) serviceData.iconImage = iconImage;
    if (heroImage) serviceData.heroImage = heroImage;

    await Service.findByIdAndUpdate(req.params.id, serviceData);
    
    req.flash('success', 'Service updated successfully');
    res.redirect('/admin/services');
  } catch (error) {
    console.error('Update service error:', error);
    req.flash('error', 'Failed to update service');
    res.redirect(`/admin/services/${req.params.id}/edit`);
  }
};

// Delete service
exports.delete = async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    req.flash('success', 'Service deleted successfully');
    res.redirect('/admin/services');
  } catch (error) {
    console.error('Delete service error:', error);
    req.flash('error', 'Failed to delete service');
    res.redirect('/admin/services');
  }
};

