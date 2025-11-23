const Product = require('../models/Product');
const Image = require('../models/Image');
const slugify = require('slugify');

// List all products
exports.list = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('featuredImage')
      .sort({ displayOrder: 1, createdAt: -1 });
    res.render('admin/products/list', { title: 'Products', products });
  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load products' });
  }
};

// Show create form
exports.createForm = async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.render('admin/products/form', { title: 'Create Product', product: null, images });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load form' });
  }
};

// Create product
exports.create = async (req, res) => {
  try {
    const { name, shortDescription, description, price, featuredImage, images, category, sizes, status, displayOrder, isActive, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      req.flash('error', 'Name and description are required');
      const images = await Image.find().sort({ createdAt: -1 });
      return res.render('admin/products/form', {
        title: 'Create Product',
        product: null,
        images,
        formData: req.body
      });
    }
    
    const slugify = require('slugify');
    let productSlug = slugify(name, { lower: true, strict: true });
    let slugExists = await Product.findOne({ slug: productSlug });
    let counter = 1;
    while (slugExists) {
      productSlug = `${slugify(name, { lower: true, strict: true })}-${counter}`;
      slugExists = await Product.findOne({ slug: productSlug });
      counter++;
    }
    
    const productData = {
      name: name.trim(),
      slug: productSlug,
      shortDescription: shortDescription ? shortDescription.trim() : '',
      description: description.trim(),
      price: parseFloat(price) || 0,
      category: category || 'general',
      sizes: sizes ? (Array.isArray(sizes) ? sizes.filter(s => s && s.trim()).map(s => s.trim()) : [sizes.trim()].filter(s => s)) : [],
      displayOrder: parseInt(displayOrder) || 0,
      isActive: isActive === 'on',
      status: status || 'draft',
      seoTitle: seoTitle ? seoTitle.trim() : '',
      seoDescription: seoDescription ? seoDescription.trim() : '',
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
      seoCanonicalUrl: seoCanonicalUrl ? seoCanonicalUrl.trim() : '',
      seoIndex: seoIndex !== 'false'
    };

    if (featuredImage && featuredImage !== '') {
      productData.featuredImage = featuredImage;
    } else {
      productData.featuredImage = null;
    }
    
    if (images) {
      if (Array.isArray(images)) {
        productData.images = images.filter(img => img && img !== '');
      } else if (images !== '') {
        productData.images = [images];
      } else {
        productData.images = [];
      }
    } else {
      productData.images = [];
    }

    const product = new Product(productData);
    await product.save();
    
    req.flash('success', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    
    // Better error handling - show actual error message
    const errorMessage = error.message || 'Failed to create product';
    req.flash('error', errorMessage);
    
    try {
      const images = await Image.find().sort({ createdAt: -1 });
      res.render('admin/products/form', {
        title: 'Create Product',
        product: null,
        images,
        formData: req.body,
        error: errorMessage
      });
    } catch (renderError) {
      console.error('Error rendering form:', renderError);
      res.redirect('/admin/products/new');
    }
  }
};

// Show edit form
exports.editForm = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('images featuredImage');
    const images = await Image.find().sort({ createdAt: -1 });
    res.render('admin/products/form', { title: 'Edit Product', product, images });
  } catch (error) {
    console.error('Edit form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load product' });
  }
};

// Update product
exports.update = async (req, res) => {
  try {
    const { name, shortDescription, description, price, featuredImage, images, category, sizes, status, displayOrder, isActive, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    const productData = {
      name,
      shortDescription,
      description,
      price: parseFloat(price) || 0,
      category: category || 'general',
      sizes: sizes ? (Array.isArray(sizes) ? sizes.filter(s => s && s.trim()).map(s => s.trim()) : [sizes.trim()].filter(s => s)) : [],
      displayOrder: parseInt(displayOrder) || 0,
      isActive: isActive === 'on',
      status: status || 'draft',
      seoTitle,
      seoDescription,
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [],
      seoCanonicalUrl,
      seoIndex: seoIndex !== 'false'
    };

    if (featuredImage) productData.featuredImage = featuredImage;
    if (images) {
      productData.images = Array.isArray(images) ? images : [images];
    }

    await Product.findByIdAndUpdate(req.params.id, productData);
    
    req.flash('success', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Update product error:', error);
    req.flash('error', 'Failed to update product');
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
};

// Delete product
exports.delete = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    req.flash('success', 'Product deleted successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Delete product error:', error);
    req.flash('error', 'Failed to delete product');
    res.redirect('/admin/products');
  }
};

