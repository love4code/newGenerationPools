const Project = require('../models/Project');
const Service = require('../models/Service');
const Product = require('../models/Product');
const Image = require('../models/Image');
const ContactMessage = require('../models/ContactMessage');
const GlobalSettings = require('../models/GlobalSettings');

// Dashboard
exports.dashboard = async (req, res) => {
  try {
    const projectsCount = await Project.countDocuments();
    const servicesCount = await Service.countDocuments();
    const productsCount = await Product.countDocuments();
    const portfolioCount = await Project.countDocuments({ showInPortfolio: true, status: 'published' });
    const imagesCount = await Image.countDocuments();
    const messagesCount = await ContactMessage.countDocuments({ isRead: false });

    const recentProjects = await Project.find()
      .populate('featuredImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentImages = await Image.find()
      .select('-originalData -thumbnailData -mediumData -largeData')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .allowDiskUse(true);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      projectsCount,
      servicesCount,
      productsCount,
      portfolioCount,
      imagesCount,
      messagesCount,
      recentProjects,
      recentImages
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    console.error('Dashboard error message:', error.message);
    console.error('Dashboard error stack:', error.stack);
    res.status(500).render('admin/error', { 
      error: 'Failed to load dashboard',
      errorDetails: process.env.NODE_ENV === 'development' ? error.message + '\n\n' + error.stack : undefined
    });
  }
};

