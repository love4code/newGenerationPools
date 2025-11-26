const Project = require('../models/Project');
const Service = require('../models/Service');
const Product = require('../models/Product');
const Image = require('../models/Image');
const ContactMessage = require('../models/ContactMessage');
const Order = require('../models/Order');
const GlobalSettings = require('../models/GlobalSettings');
const nodemailer = require('nodemailer');

// Theme presets (must match controller)
const themePresets = {
  default: {
    primaryColor: '#0d6efd',
    secondaryColor: '#6c757d',
    navbarColor: '#212529',
    footerColor: '#2c3e50'
  },
  ocean: {
    primaryColor: '#0066cc',
    secondaryColor: '#4da6ff',
    navbarColor: '#003366',
    footerColor: '#004080'
  },
  sky: {
    primaryColor: '#3399ff',
    secondaryColor: '#66b3ff',
    navbarColor: '#1a5490',
    footerColor: '#2d6ba3'
  },
  navy: {
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    navbarColor: '#0f172a',
    footerColor: '#1e293b'
  },
  teal: {
    primaryColor: '#0d9488',
    secondaryColor: '#14b8a6',
    navbarColor: '#0f172a',
    footerColor: '#134e4a'
  }
};

// Helper to get settings with theme
const getSettingsWithTheme = async () => {
  const settings = await GlobalSettings.getSettings();
  if (!settings.theme) {
    settings.theme = {
      preset: 'default',
      primaryColor: '#0d6efd',
      secondaryColor: '#6c757d',
      navbarColor: '#212529',
      footerColor: '#2c3e50',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    };
  } else {
    // Apply preset if not custom
    if (settings.theme.preset && settings.theme.preset !== 'custom' && themePresets[settings.theme.preset]) {
      settings.theme = {
        ...settings.theme,
        ...themePresets[settings.theme.preset]
      };
    }
  }
  return settings;
};

// Home page
exports.home = async (req, res) => {
  try {
    const settings = await getSettingsWithTheme();
    const services = await Service.find({ isActive: true })
      .populate('iconImage')
      .sort({ displayOrder: 1 })
      .limit(6);
    
    // Get products for home page
    const products = await Product.find({ 
      status: 'published',
      isActive: true 
    })
      .populate('featuredImage images')
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(3);

    // Get recent projects (different from featured, or more recent)
    const recentProjects = await Project.find({ 
      status: 'published',
      showInPortfolio: true 
    })
      .populate('featuredImage images')
      .sort({ createdAt: -1 })
      .limit(4);

    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Debug: Log counts
    console.log('Recent projects count:', recentProjects ? recentProjects.length : 0);
    console.log('Products count:', products ? products.length : 0);
    
    res.render('public/home', {
      title: settings.defaultMetaTitle,
      description: settings.defaultMetaDescription,
      services,
      products: products || [],
      recentProjects: recentProjects || [],
      settings,
      baseUrl
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('public/error', { error: 'Failed to load page' });
  }
};

// Services listing
exports.services = async (req, res) => {
  try {
    const settings = await getSettingsWithTheme();
    const services = await Service.find({ isActive: true })
      .populate('iconImage heroImage')
      .sort({ displayOrder: 1 });

    const baseUrl = req.protocol + '://' + req.get('host');
    res.render('public/services', {
      title: 'Our Services - New Generation Pools',
      description: 'Explore our comprehensive pool services including design, installation, and maintenance.',
      services,
      settings,
      baseUrl
    });
  } catch (error) {
    console.error('Services page error:', error);
    res.status(500).render('public/error', { error: 'Failed to load services' });
  }
};

// Service detail
exports.serviceDetail = async (req, res) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug, isActive: true })
      .populate('iconImage heroImage');
    
    if (!service) {
      return res.status(404).render('public/404');
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const seo = {
      title: service.seoTitle || `${service.name} - New Generation Pools`,
      description: service.seoDescription || service.shortDescription || 'New Generation Pools Service',
      keywords: service.seoKeywords || [],
      canonicalUrl: service.seoCanonicalUrl || baseUrl + req.originalUrl,
      ogImage: service.heroImage ? baseUrl + service.heroImage.largePath : '',
      ogUrl: baseUrl + req.originalUrl,
      index: service.seoIndex
    };

    res.render('public/service-detail', {
      service,
      seo,
      title: seo.title,
      baseUrl
    });
  } catch (error) {
    console.error('Service detail error:', error);
    res.status(500).render('public/error', { error: 'Failed to load service' });
  }
};

// Portfolio listing
exports.portfolio = async (req, res) => {
  try {
    const projects = await Project.find({ 
      status: 'published',
      showInPortfolio: true 
    })
      .populate('featuredImage')
      .sort({ createdAt: -1 });

    const baseUrl = req.protocol + '://' + req.get('host');
    const settings = await getSettingsWithTheme();
    res.render('public/portfolio', {
      title: 'Our Portfolio - New Generation Pools',
      description: 'View our portfolio of completed pool projects.',
      projects,
      settings,
      baseUrl
    });
  } catch (error) {
    console.error('Portfolio page error:', error);
    res.status(500).render('public/error', { error: 'Failed to load portfolio' });
  }
};

// Project detail
exports.projectDetail = async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug, status: 'published' })
      .populate('featuredImage images');
    
    if (!project) {
      return res.status(404).render('public/404');
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const seo = {
      title: project.seoTitle || `${project.title} - New Generation Pools`,
      description: project.seoDescription || project.shortDescription || 'New Generation Pools Project',
      keywords: project.seoKeywords || [],
      canonicalUrl: project.seoCanonicalUrl || baseUrl + req.originalUrl,
      ogImage: project.featuredImage ? baseUrl + project.featuredImage.largePath : '',
      ogUrl: baseUrl + req.originalUrl,
      index: project.seoIndex
    };

    res.render('public/project-detail', {
      project,
      seo,
      title: seo.title,
      baseUrl
    });
  } catch (error) {
    console.error('Project detail error:', error);
    res.status(500).render('public/error', { error: 'Failed to load project' });
  }
};

// Products listing
exports.products = async (req, res) => {
  try {
    const settings = await getSettingsWithTheme();
    const products = await Product.find({ 
      status: 'published',
      isActive: true 
    })
      .populate('featuredImage images')
      .sort({ displayOrder: 1, createdAt: -1 });

    const baseUrl = req.protocol + '://' + req.get('host');
    res.render('public/products', {
      title: 'Our Products - New Generation Pools',
      description: 'Browse our selection of premium pool products.',
      products,
      settings,
      baseUrl
    });
  } catch (error) {
    console.error('Products page error:', error);
    res.status(500).render('public/error', { error: 'Failed to load products' });
  }
};

// Product detail
exports.productDetail = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, status: 'published', isActive: true })
      .populate('featuredImage images');
    
    if (!product) {
      return res.status(404).render('public/404');
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const seo = {
      title: product.seoTitle || `${product.name} - New Generation Pools`,
      description: product.seoDescription || product.shortDescription || 'New Generation Pools Product',
      keywords: product.seoKeywords || [],
      canonicalUrl: product.seoCanonicalUrl || baseUrl + req.originalUrl,
      ogImage: product.featuredImage ? baseUrl + product.featuredImage.largePath : '',
      ogUrl: baseUrl + req.originalUrl,
      index: product.seoIndex
    };

    // Get flash messages
    const error = req.flash('error');
    const success = req.flash('success');

    res.render('public/product-detail', {
      product,
      seo,
      title: seo.title,
      baseUrl,
      error,
      success
    });
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).render('public/error', { error: 'Failed to load product' });
  }
};

// Handle product order submission
exports.productOrderSubmit = async (req, res) => {
  try {
    const { productId, productName, sizes, name, email, phone, address, city, state, zipCode, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      req.flash('error', 'Name, email, and phone are required fields.');
      return res.redirect(`/products/${req.params.slug}`);
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect(`/products/${req.params.slug}`);
    }

    // Process sizes array
    let sizesArray = [];
    if (sizes) {
      if (Array.isArray(sizes)) {
        sizesArray = sizes.filter(s => s && s.trim()).map(s => s.trim());
      } else if (typeof sizes === 'string' && sizes.trim()) {
        sizesArray = [sizes.trim()];
      }
    }

    // Create order
    const order = new Order({
      productId: product._id,
      productName: productName || product.name,
      sizes: sizesArray,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      zipCode: zipCode ? zipCode.trim() : '',
      message: message ? message.trim() : '',
      status: 'pending'
    });

    await order.save();

    // Send email if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const sizesText = sizesArray.length > 0 ? sizesArray.join(', ') : 'No sizes selected';
        
        const mailOptions = {
          from: process.env.SMTP_USER,
          to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
          subject: `New Product Order: ${productName}`,
          html: `
            <h2>New Product Order</h2>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Sizes:</strong> ${sizesText}</p>
            <hr>
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            ${address ? `<p><strong>Address:</strong> ${address}</p>` : ''}
            ${city || state || zipCode ? `<p><strong>City/State/Zip:</strong> ${city || ''} ${state || ''} ${zipCode || ''}</p>` : ''}
            ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
          `
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Error sending order email:', emailError);
        // Don't fail the order if email fails
      }
    }

    req.flash('success', 'Thank you for your order! We will contact you shortly to confirm the details.');
    res.redirect(`/products/${req.params.slug}`);
  } catch (error) {
    console.error('Product order submit error:', error);
    req.flash('error', 'Failed to submit order. Please try again or contact us directly.');
    res.redirect(`/products/${req.params.slug}`);
  }
};

// Contact page
exports.contact = async (req, res) => {
  try {
    const settings = await getSettingsWithTheme();
    const baseUrl = req.protocol + '://' + req.get('host');
    res.render('public/contact', {
      title: 'Contact Us - New Generation Pools',
      description: 'Get in touch with New Generation Pools for all your pool needs.',
      settings,
      baseUrl
    });
  } catch (error) {
    console.error('Contact page error:', error);
    res.status(500).render('public/error', { error: 'Failed to load contact page' });
  }
};

// Handle home page contact form submission
exports.homeContactSubmit = async (req, res) => {
  try {
    const { name, email, phone, town, serviceType, message } = req.body;

    // Save to database
    const contactMessage = new ContactMessage({
      name,
      email,
      phone,
      town,
      serviceType,
      message: message || `Service Type: ${serviceType || 'Not specified'}`
    });
    await contactMessage.save();

    // Send email if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
        subject: `New Home Page Contact Form Submission from ${name}`,
        html: `
          <h2>New Home Page Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Town:</strong> ${town || 'Not provided'}</p>
          <p><strong>Service Type:</strong> ${serviceType || 'Not specified'}</p>
          ${message ? `<p><strong>Message:</strong></p><p>${message}</p>` : ''}
        `
      };

      await transporter.sendMail(mailOptions);
    }

    req.flash('success', 'Thank you for your inquiry! We will get back to you soon.');
    res.redirect('/');
  } catch (error) {
    console.error('Home contact submit error:', error);
    req.flash('error', 'Failed to send message. Please try again.');
    res.redirect('/');
  }
};

// Handle contact form submission
exports.contactSubmit = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // Save to database
    const contactMessage = new ContactMessage({
      name,
      email,
      phone,
      message
    });
    await contactMessage.save();

    // Send email if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.CONTACT_EMAIL || process.env.SMTP_USER,
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }

    req.flash('success', 'Thank you for your message! We will get back to you soon.');
    res.redirect('/contact');
  } catch (error) {
    console.error('Contact submit error:', error);
    req.flash('error', 'Failed to send message. Please try again.');
    res.redirect('/contact');
  }
};

