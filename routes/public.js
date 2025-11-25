const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');
const mediaController = require('../controllers/mediaController');

// Image serving (must be before other routes to avoid conflicts)
router.get('/api/images/:id/:size', mediaController.serve);

// Home
router.get('/', publicController.home);
router.post('/home-contact', publicController.homeContactSubmit);

// Services
router.get('/services', publicController.services);
router.get('/services/:slug', publicController.serviceDetail);

// Portfolio
router.get('/portfolio', publicController.portfolio);
router.get('/projects/:slug', publicController.projectDetail);

// Products
router.get('/products', publicController.products);
router.get('/products/:slug', publicController.productDetail);
router.post('/products/:slug/order', publicController.productOrderSubmit);

// Contact
router.get('/contact', publicController.contact);
router.post('/contact', publicController.contactSubmit);

module.exports = router;

