const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;
const Image = require('../models/Image');

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads/original');
    await fs.mkdir(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
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

// Process uploaded image and create 3 sizes
const processImage = async (filePath, filename) => {
  const baseName = path.parse(filename).name;
  const ext = path.parse(filename).ext;
  
  const thumbnailPath = path.join(__dirname, '../public/uploads/thumbnails', `${baseName}${ext}`);
  const mediumPath = path.join(__dirname, '../public/uploads/medium', `${baseName}${ext}`);
  const largePath = path.join(__dirname, '../public/uploads/large', `${baseName}${ext}`);

  // Ensure directories exist
  await fs.mkdir(path.dirname(thumbnailPath), { recursive: true });
  await fs.mkdir(path.dirname(mediumPath), { recursive: true });
  await fs.mkdir(path.dirname(largePath), { recursive: true });

  // Create thumbnail (150x150)
  await sharp(filePath)
    .resize(150, 150, { fit: 'cover' })
    .toFile(thumbnailPath);

  // Create medium (800px wide)
  await sharp(filePath)
    .resize(800, null, { withoutEnlargement: true })
    .toFile(mediumPath);

  // Create large (1600px wide)
  await sharp(filePath)
    .resize(1600, null, { withoutEnlargement: true })
    .toFile(largePath);

  return {
    originalPath: `/uploads/original/${filename}`,
    thumbnailPath: `/uploads/thumbnails/${baseName}${ext}`,
    mediumPath: `/uploads/medium/${baseName}${ext}`,
    largePath: `/uploads/large/${baseName}${ext}`
  };
};

// Middleware to handle single image upload and processing
const uploadAndProcessImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next();
    }

    const processedPaths = await processImage(req.file.path, req.file.filename);
    
    // Save to database
    const image = new Image({
      filename: req.file.originalname,
      originalPath: processedPaths.originalPath,
      thumbnailPath: processedPaths.thumbnailPath,
      mediumPath: processedPaths.mediumPath,
      largePath: processedPaths.largePath,
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
        // Check if file exists
        if (!file || !file.path) {
          console.error('Invalid file:', file);
          continue;
        }

        const processedPaths = await processImage(file.path, file.filename);
        
        // Use filename as title if no title provided
        const image = new Image({
          filename: file.originalname || 'unnamed',
          originalPath: processedPaths.originalPath,
          thumbnailPath: processedPaths.thumbnailPath,
          mediumPath: processedPaths.mediumPath,
          largePath: processedPaths.largePath,
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

