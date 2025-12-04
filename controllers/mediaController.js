const Image = require('../models/Image');
const { upload, uploadAndProcessImage, uploadAndProcessMultipleImages } = require('../middleware/upload');

// List all images
exports.list = async (req, res) => {
  try {
    // Exclude buffer data to save memory - only select metadata
    const images = await Image.find()
      .select('-originalData -thumbnailData -mediumData -largeData')
      .sort({ createdAt: -1 })
      .allowDiskUse(true);
    res.render('admin/media/list', { title: 'Media Library', images });
  } catch (error) {
    console.error('Media list error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load media library' });
  }
};

// Upload single image
exports.upload = [
  upload.single('image'),
  uploadAndProcessImage,
  async (req, res) => {
    try {
      if (req.uploadedImage) {
        req.flash('success', 'Image uploaded successfully');
      } else {
        req.flash('error', 'Failed to upload image');
      }
      res.redirect('/admin/media');
    } catch (error) {
      console.error('Upload error:', error);
      req.flash('error', 'Failed to upload image');
      res.redirect('/admin/media');
    }
  }
];

// Upload multiple images
exports.uploadMultiple = [
  upload.array('images', 20), // Allow up to 20 images
  uploadAndProcessMultipleImages,
  async (req, res) => {
    try {
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        req.flash('success', `${req.uploadedImages.length} image(s) uploaded successfully`);
        return res.status(200).json({ 
          success: true, 
          message: `${req.uploadedImages.length} image(s) uploaded successfully`,
          count: req.uploadedImages.length,
          images: req.uploadedImages.map(img => ({
            _id: img._id,
            filename: img.filename,
            title: img.title,
            altText: img.altText,
            thumbnailPath: img.thumbnailPath,
            mediumPath: img.mediumPath,
            largePath: img.largePath,
            category: img.category
          }))
        });
      } else {
        req.flash('error', 'No images were uploaded');
        return res.status(400).json({ 
          success: false, 
          message: 'No images were uploaded. Please check your files and try again.' 
        });
      }
    } catch (error) {
      console.error('Upload multiple error:', error);
      req.flash('error', 'Failed to upload images: ' + error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to upload images: ' + error.message 
      });
    }
  }
];

// Update image metadata
exports.update = async (req, res) => {
  try {
    const { altText, title, category } = req.body;
    await Image.findByIdAndUpdate(req.params.id, {
      altText: altText || '',
      title: title || '',
      category: category || 'general'
    });
    req.flash('success', 'Image updated successfully');
    res.redirect('/admin/media');
  } catch (error) {
    console.error('Update image error:', error);
    req.flash('error', 'Failed to update image');
    res.redirect('/admin/media');
  }
};

// Delete image
exports.delete = async (req, res) => {
  try {
    const image = await Image.findById(req.params.id);
    if (!image) {
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(404).json({ success: false, message: 'Image not found' });
      }
      req.flash('error', 'Image not found');
      return res.redirect('/admin/media');
    }

    // Image data is stored in database, so deletion is straightforward
    await Image.findByIdAndDelete(req.params.id);

    // Return JSON response for API calls, otherwise redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ 
        success: true, 
        message: 'Image deleted successfully',
        id: req.params.id
      });
    }

    req.flash('success', 'Image deleted successfully');
    res.redirect('/admin/media');
  } catch (error) {
    console.error('Delete image error:', error);
    
    // Return JSON response for API calls, otherwise redirect
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete image: ' + error.message 
      });
    }
    
    req.flash('error', 'Failed to delete image');
    res.redirect('/admin/media');
  }
};

// API endpoint to get images (for modals/selectors)
exports.apiList = async (req, res) => {
  try {
    // Exclude buffer data to save bandwidth - only select metadata
    const images = await Image.find()
      .select('-originalData -thumbnailData -mediumData -largeData')
      .sort({ createdAt: -1 })
      .allowDiskUse(true);
    res.json(images);
  } catch (error) {
    console.error('API list error:', error);
    res.status(500).json({ error: 'Failed to load images' });
  }
};

// Serve image from database
exports.serve = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id, size } = req.params;
    
    // Validate size parameter early
    const validSizes = ['original', 'thumbnail', 'medium', 'large'];
    if (!validSizes.includes(size)) {
      return res.status(400).send('Invalid size parameter. Use: original, thumbnail, medium, or large');
    }

    // Check if client has cached version (304 Not Modified) - do this BEFORE database query
    const ifNoneMatch = req.headers['if-none-match'];
    const etag = `"${id}-${size}"`;
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    // Check MongoDB connection state before querying
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. State:', mongoose.connection.readyState);
      return res.status(503).send('Database temporarily unavailable');
    }

    // Only select the specific size field we need to reduce memory usage
    // This is much more efficient than loading all sizes
    const sizeField = `${size}Data`;
    const selectFields = `mimeType ${sizeField}`;
    
    // Add timeout to image query (reduced to 8 seconds for faster failure)
    // Don't use .lean() here because we need the Buffer to work properly
    const imageQuery = Image.findById(id).select(selectFields);
    const image = await Promise.race([
      imageQuery,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Image query timeout')), 8000)
      )
    ]);
    
    if (!image) {
      return res.status(404).send('Image not found');
    }

    const imageData = image[sizeField];
    if (!imageData) {
      return res.status(404).send('Image data not found');
    }

    // Ensure imageData is a Buffer
    const buffer = Buffer.isBuffer(imageData) ? imageData : Buffer.from(imageData);
    const contentLength = buffer.length;

    // Validate content length is a valid number
    if (typeof contentLength !== 'number' || isNaN(contentLength) || contentLength <= 0) {
      console.error(`Invalid content length for image ${id}/${size}:`, contentLength);
      return res.status(500).send('Invalid image data');
    }

    // Set appropriate headers with aggressive caching
    res.set({
      'Content-Type': image.mimeType || 'image/jpeg', // Default to jpeg if mimeType is missing
      'Content-Length': String(contentLength), // Ensure it's a string
      'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year, immutable
      'ETag': etag, // ETag for conditional requests
      'Last-Modified': new Date().toUTCString()
    });

    const loadTime = Date.now() - startTime;
    if (loadTime > 3000) {
      console.warn(`Slow image load: ${id}/${size} took ${loadTime}ms`);
    }

    res.send(buffer);
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.error(`Serve image error (${loadTime}ms):`, error.message);
    
    // Check if it's a timeout or connection issue
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('MongoDB connection issue detected');
    }
    
    if (!res.headersSent) {
      res.status(500).send('Failed to serve image');
    }
  }
};

