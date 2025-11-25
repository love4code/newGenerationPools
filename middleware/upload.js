const multer = require('multer');
const sharp = require('sharp');
const Image = require('../models/Image');

// Configure multer to use memory storage (no filesystem writes)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Process uploaded image buffer and create 3 sizes in memory
const processImage = async (buffer, mimeType) => {
  // Create thumbnail (150x150)
  const thumbnailBuffer = await sharp(buffer)
    .resize(150, 150, { fit: 'cover' })
    .toBuffer();

  // Create medium (800px wide)
  const mediumBuffer = await sharp(buffer)
    .resize(800, null, { withoutEnlargement: true })
    .toBuffer();

  // Create large (1600px wide)
  const largeBuffer = await sharp(buffer)
    .resize(1600, null, { withoutEnlargement: true })
    .toBuffer();

  return {
    originalData: buffer,
    thumbnailData: thumbnailBuffer,
    mediumData: mediumBuffer,
    largeData: largeBuffer
  };
};

// Middleware to handle single image upload and processing
const uploadAndProcessImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const processedImages = await processImage(req.file.buffer, req.file.mimetype);
    
    // Save to database
    const image = new Image({
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      originalData: processedImages.originalData,
      thumbnailData: processedImages.thumbnailData,
      mediumData: processedImages.mediumData,
      largeData: processedImages.largeData,
      altText: req.body.altText || '',
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'general'
    });

    await image.save();
    req.uploadedImage = image;
    next();
  } catch (error) {
    console.error('Error processing image:', error);
    next(error);
  }
};

// Middleware to handle multiple image uploads and processing
const uploadAndProcessMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const uploadedImages = [];
    const category = req.body.category || 'general';
    
    for (const file of req.files) {
      try {
        // Check if file exists and has buffer
        if (!file || !file.buffer) {
          console.error('Invalid file:', file);
          continue;
        }

        const processedImages = await processImage(file.buffer, file.mimetype);
        
        // Use filename as title if no title provided
        const image = new Image({
          filename: file.originalname || 'unnamed',
          mimeType: file.mimetype,
          originalData: processedImages.originalData,
          thumbnailData: processedImages.thumbnailData,
          mediumData: processedImages.mediumData,
          largeData: processedImages.largeData,
          altText: '',
          title: file.originalname || 'Untitled',
          category: category
        });

        await image.save();
        uploadedImages.push(image);
      } catch (error) {
        console.error(`Error processing image ${file.originalname || 'unknown'}:`, error);
        // Continue with other images even if one fails
      }
    }

    req.uploadedImages = uploadedImages;
    next();
  } catch (error) {
    console.error('Error processing multiple images:', error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadAndProcessImage,
  uploadAndProcessMultipleImages,
  processImage
};

