const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const adminController = require('../controllers/adminController')
const projectController = require('../controllers/projectController')
const serviceController = require('../controllers/serviceController')
const productController = require('../controllers/productController')
const mediaController = require('../controllers/mediaController')
const settingsController = require('../controllers/settingsController')
const customerController = require('../controllers/customerController')
const saleController = require('../controllers/saleController')

// All admin routes require authentication
router.use(requireAuth)

// Dashboard
router.get('/', adminController.dashboard)

// Projects routes
router.get('/projects', projectController.list)
router.get('/projects/new', projectController.createForm)
router.post('/projects', projectController.create)
router.get('/projects/:id/edit', projectController.editForm)
router.post('/projects/:id', projectController.update)
router.post('/projects/:id/delete', projectController.delete)

// Services routes
router.get('/services', serviceController.list)
router.get('/services/new', serviceController.createForm)
router.post('/services', serviceController.create)
router.get('/services/:id/edit', serviceController.editForm)
router.post('/services/:id', serviceController.update)
router.post('/services/:id/delete', serviceController.delete)

// Products routes
router.get('/products', productController.list)
router.get('/products/new', productController.createForm)
router.post('/products', productController.create)
router.get('/products/:id/edit', productController.editForm)
router.post('/products/:id', productController.update)
router.post('/products/:id/delete', productController.delete)
router.get('/api/products', productController.apiSearch)
router.post('/api/products', productController.apiCreate)

// Media library routes
router.get('/media', mediaController.list)
router.post('/media/upload', mediaController.upload)
router.post('/media/upload-multiple', mediaController.uploadMultiple)
router.post('/media/:id', mediaController.update)
router.post('/media/:id/delete', mediaController.delete)
router.get('/api/media', mediaController.apiList)

// Sales routes (must come before customers/:id to avoid route conflicts)
router.get('/sales', saleController.list)
router.get('/customers/:customerId/sales/new', saleController.createForm)
router.post('/customers/:customerId/sales', saleController.create)
router.get('/sales/:id', saleController.show)
router.get('/sales/:id/edit', saleController.editForm)
router.post('/sales/:id', saleController.update)
router.post('/sales/:id/delete', saleController.delete)

// Customers routes
router.get('/customers', customerController.list)
router.get('/customers/new', customerController.createForm)
router.post('/customers', customerController.create)
router.get('/customers/:id', customerController.show)
router.get('/customers/:id/edit', customerController.editForm)
router.post('/customers/:id', customerController.update)
router.post('/customers/:id/delete', customerController.delete)

// Settings routes
router.get('/settings', settingsController.show)
router.post('/settings', settingsController.update)

module.exports = router
