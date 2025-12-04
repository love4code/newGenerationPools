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
  try {
    // Add timeout to the getSettings call itself
    const settings = await Promise.race([
      GlobalSettings.getSettings(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getSettings timeout')), 5000)
      )
    ]);
    
    // Populate defaultOpenGraphImage if it exists (with timeout to prevent hanging)
    if (settings.defaultOpenGraphImage) {
      try {
        await Promise.race([
          settings.populate('defaultOpenGraphImage'),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Populate timeout')), 3000)
          )
        ]);
      } catch (populateError) {
        console.warn('Failed to populate defaultOpenGraphImage:', populateError.message);
        // Continue without the image if populate fails
        settings.defaultOpenGraphImage = null;
      }
    }
    
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
  } catch (error) {
    console.error('getSettingsWithTheme error:', error);
    // Return default settings if query fails
    return {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      defaultOpenGraphImage: null,
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };
  }
};

// Helper function to add timeout to promises
const withTimeout = (promise, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    )
  ]);
};

// Helper function to add image paths to lean documents (since virtuals don't work with lean)
const addImagePaths = (image) => {
  if (!image || !image._id) return image;
  return {
    ...image,
    originalPath: `/api/images/${image._id}/original`,
    thumbnailPath: `/api/images/${image._id}/thumbnail`,
    mediumPath: `/api/images/${image._id}/medium`,
    largePath: `/api/images/${image._id}/large`
  };
};

// Helper to process arrays of items with images
const processItemsWithImages = (items) => {
  if (!items || !Array.isArray(items)) return items;
  return items.map(item => {
    const processed = { ...item };
    if (item.featuredImage) {
      processed.featuredImage = addImagePaths(item.featuredImage);
    }
    if (item.iconImage) {
      processed.iconImage = addImagePaths(item.iconImage);
    }
    if (item.heroImage) {
      processed.heroImage = addImagePaths(item.heroImage);
    }
    if (item.images && Array.isArray(item.images)) {
      processed.images = item.images.map(img => addImagePaths(img));
    }
    return processed;
  });
};

// Home page
exports.home = async (req, res) => {
  const startTime = Date.now();
  console.log('Home page request started');
  
  try {
    // Run all queries in parallel with timeouts
    const [settings, services, products, recentProjects] = await Promise.all([
      withTimeout(getSettingsWithTheme(), 5000).catch(err => {
        console.error('Settings query error:', err);
        return null; // Return null if settings fail
      }),
      withTimeout(
        Service.find({ isActive: true })
          .populate('iconImage')
          .sort({ displayOrder: 1 })
          .limit(6)
          .lean({ virtuals: true }), // Include virtuals for image paths
        8000
      ).catch(err => {
        console.error('Services query error:', err);
        return []; // Return empty array if services fail
      }),
      withTimeout(
        Product.find({ 
          status: 'published',
          isActive: true 
        })
          .populate({
            path: 'featuredImage',
            select: '_id altText' // Only select needed fields, virtuals will be included
          })
          .populate({
            path: 'images',
            select: '_id altText',
            options: { limit: 1 } // Only load first image for home page
          })
          .select('name slug shortDescription price featuredImage images displayOrder') // Only select needed fields
          .sort({ displayOrder: 1, createdAt: -1 })
          .limit(3)
          .lean({ virtuals: true }), // Include virtuals for image paths
        8000
      ).catch(err => {
        console.error('Products query error:', err);
        return []; // Return empty array if products fail
      }),
      withTimeout(
        Project.find({ 
          status: 'published',
          showInPortfolio: true 
        })
          .populate({
            path: 'featuredImage',
            select: '_id altText' // Only select needed fields, virtuals will be included
          })
          .populate({
            path: 'images',
            select: '_id altText',
            options: { limit: 1 } // Only load first image for home page
          })
          .select('title slug shortDescription featuredImage images createdAt') // Only select needed fields
          .sort({ createdAt: -1 })
          .limit(4)
          .lean({ virtuals: true }), // Include virtuals for image paths
        8000
      ).catch(err => {
        console.error('Projects query error:', err);
        return []; // Return empty array if projects fail
      })
    ]);

    // Use default settings if query failed
    let finalSettings = settings || {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      defaultOpenGraphImage: null,
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    // Ensure settings image has paths (convert to plain object if needed)
    if (finalSettings && finalSettings.defaultOpenGraphImage) {
      if (finalSettings.defaultOpenGraphImage._id && !finalSettings.defaultOpenGraphImage.largePath) {
        finalSettings.defaultOpenGraphImage = addImagePaths(finalSettings.defaultOpenGraphImage);
      }
    }

    // Process images to add paths (since lean() doesn't include virtuals)
    const processedServices = processItemsWithImages(services);
    const processedProducts = processItemsWithImages(products);
    const processedProjects = processItemsWithImages(recentProjects);

    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Set SEO data with defaultOpenGraphImage (logo) as ogImage
    const seo = {
      title: finalSettings.defaultMetaTitle || 'New Generation Pools',
      description: finalSettings.defaultMetaDescription || 'Premium Pool Services',
      ogImage: finalSettings.defaultOpenGraphImage && finalSettings.defaultOpenGraphImage.largePath 
        ? baseUrl + finalSettings.defaultOpenGraphImage.largePath 
        : '',
      ogUrl: baseUrl + req.originalUrl,
      canonicalUrl: baseUrl + req.originalUrl
    };
    
    // Debug: Log counts and timing
    console.log('Recent projects count:', recentProjects ? recentProjects.length : 0);
    console.log('Products count:', products ? products.length : 0);
    console.log('Home page loaded in', Date.now() - startTime, 'ms');
    
    res.render('public/home', {
      title: seo.title,
      description: seo.description,
      seo,
      services: processedServices || [],
      products: processedProducts || [],
      recentProjects: processedProjects || [],
      settings: finalSettings,
      baseUrl
    });
  } catch (error) {
    console.error('Home page error:', error);
    console.error('Error stack:', error.stack);
    // Ensure locals are set for error page
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated === true);
    res.locals.session = req.session || null;
    res.locals.username = req.session && req.session.username ? req.session.username : null;
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    
    res.status(500).render('public/error', { 
      title: 'Error',
      error: 'Failed to load page. Please try again later.' 
    });
  }
};

// Services listing
exports.services = async (req, res) => {
  const startTime = Date.now();
  console.log('Services page request started');
  
  try {
    const [settings, services] = await Promise.all([
      withTimeout(getSettingsWithTheme(), 5000).catch(err => {
        console.error('Settings query error:', err);
        return null;
      }),
      withTimeout(
        Service.find({ isActive: true })
          .populate({
            path: 'iconImage',
            select: '_id altText'
          })
          .populate({
            path: 'heroImage',
            select: '_id altText'
          })
          .select('name slug shortDescription iconImage heroImage displayOrder')
          .sort({ displayOrder: 1 })
          .lean({ virtuals: true }),
        10000
      ).catch(err => {
        console.error('Services query error:', err);
        return [];
      })
    ]);

    const finalSettings = settings || {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    // Process images to add paths
    const processedServices = processItemsWithImages(services);

    const baseUrl = req.protocol + '://' + req.get('host');
    console.log('Services page loaded in', Date.now() - startTime, 'ms');
    
    res.render('public/services', {
      title: 'Our Services - New Generation Pools',
      description: 'Explore our comprehensive pool services including design, installation, and maintenance.',
      services: processedServices || [],
      settings: finalSettings,
      baseUrl
    });
  } catch (error) {
    console.error('Services page error:', error);
    console.error('Error stack:', error.stack);
    // Ensure locals are set for error page
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated === true);
    res.locals.session = req.session || null;
    res.locals.username = req.session && req.session.username ? req.session.username : null;
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    
    res.status(500).render('public/error', { 
      title: 'Error',
      error: 'Failed to load services. Please try again later.' 
    });
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
  const startTime = Date.now();
  console.log('Portfolio page request started');
  
  try {
    const [settings, projects] = await Promise.all([
      withTimeout(getSettingsWithTheme(), 5000).catch(err => {
        console.error('Settings query error:', err);
        return null;
      }),
      withTimeout(
        Project.find({ 
          status: 'published',
          showInPortfolio: true 
        })
          .populate({
            path: 'featuredImage',
            select: '_id altText'
          })
          .select('title slug shortDescription featuredImage createdAt')
          .sort({ createdAt: -1 })
          .lean({ virtuals: true }),
        10000
      ).catch(err => {
        console.error('Portfolio query error:', err);
        return [];
      })
    ]);

    const finalSettings = settings || {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    // Process images to add paths
    const processedProjects = processItemsWithImages(projects);

    const baseUrl = req.protocol + '://' + req.get('host');
    console.log('Portfolio page loaded in', Date.now() - startTime, 'ms');
    
    res.render('public/portfolio', {
      title: 'Our Portfolio - New Generation Pools',
      description: 'View our portfolio of completed pool projects.',
      projects: processedProjects || [],
      settings: finalSettings,
      baseUrl
    });
  } catch (error) {
    console.error('Portfolio page error:', error);
    console.error('Error stack:', error.stack);
    // Ensure locals are set for error page
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated === true);
    res.locals.session = req.session || null;
    res.locals.username = req.session && req.session.username ? req.session.username : null;
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    
    res.status(500).render('public/error', { 
      title: 'Error',
      error: 'Failed to load portfolio. Please try again later.' 
    });
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
  const startTime = Date.now();
  console.log('Products page request started');
  
  try {
    const [settings, products] = await Promise.all([
      withTimeout(getSettingsWithTheme(), 5000).catch(err => {
        console.error('Settings query error:', err);
        return null;
      }),
      withTimeout(
        Product.find({ 
          status: 'published',
          isActive: true 
        })
          .populate({
            path: 'featuredImage',
            select: '_id altText' // Virtuals will be included with lean({ virtuals: true })
          })
          .populate({
            path: 'images',
            select: '_id altText',
            options: { limit: 1 } // Only load first image for listing page
          })
          .select('name slug shortDescription price featuredImage images displayOrder')
          .sort({ displayOrder: 1, createdAt: -1 })
          .lean({ virtuals: true }), // Include virtuals for image paths
        15000 // Give more time for full listing
      ).catch(err => {
        console.error('Products query error:', err);
        return [];
      })
    ]);

    const finalSettings = settings || {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    // Process images to add paths (since lean() doesn't include virtuals)
    const processedProducts = processItemsWithImages(products);

    const baseUrl = req.protocol + '://' + req.get('host');
    console.log('Products page loaded in', Date.now() - startTime, 'ms');
    
    res.render('public/products', {
      title: 'Our Products - New Generation Pools',
      description: 'Browse our selection of premium pool products.',
      products: processedProducts || [],
      settings: finalSettings,
      baseUrl
    });
  } catch (error) {
    console.error('Products page error:', error);
    console.error('Error stack:', error.stack);
    // Ensure locals are set for error page
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated === true);
    res.locals.session = req.session || null;
    res.locals.username = req.session && req.session.username ? req.session.username : null;
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    
    res.status(500).render('public/error', { 
      title: 'Error',
      error: 'Failed to load products. Please try again later.' 
    });
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
  const startTime = Date.now();
  console.log('Contact page request started');
  
  try {
    const settings = await withTimeout(getSettingsWithTheme(), 5000).catch(err => {
      console.error('Settings query error:', err);
      return null;
    });

    const finalSettings = settings || {
      defaultMetaTitle: 'New Generation Pools',
      defaultMetaDescription: 'Premium Pool Services',
      theme: {
        preset: 'default',
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }
    };

    // Ensure settings image has paths
    if (finalSettings && finalSettings.defaultOpenGraphImage) {
      if (finalSettings.defaultOpenGraphImage._id && !finalSettings.defaultOpenGraphImage.largePath) {
        finalSettings.defaultOpenGraphImage = addImagePaths(finalSettings.defaultOpenGraphImage);
      }
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    console.log('Contact page loaded in', Date.now() - startTime, 'ms');
    
    res.render('public/contact', {
      title: 'Contact Us - New Generation Pools',
      description: 'Get in touch with New Generation Pools for all your pool needs.',
      settings: finalSettings,
      baseUrl
    });
  } catch (error) {
    console.error('Contact page error:', error);
    console.error('Error stack:', error.stack);
    // Ensure locals are set for error page
    if (!res.locals) {
      res.locals = {};
    }
    res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated === true);
    res.locals.session = req.session || null;
    res.locals.username = req.session && req.session.username ? req.session.username : null;
    res.locals.success = res.locals.success || [];
    res.locals.error = res.locals.error || [];
    
    res.status(500).render('public/error', { 
      title: 'Error',
      error: 'Failed to load contact page. Please try again later.' 
    });
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

