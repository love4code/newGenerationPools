require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const morgan = require('morgan')
const path = require('path')
const flash = require('connect-flash')

// Import routes
const publicRoutes = require('./routes/public')
const adminRoutes = require('./routes/admin')
const authRoutes = require('./routes/auth')

// Import middleware
const { setSEO } = require('./middleware/seo')

const app = express()
const PORT = process.env.PORT || 3000

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/newGenerationPools',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// View engine setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// Session configuration
const isProduction = process.env.NODE_ENV === 'production'
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: true, // Ensure session is saved on every request
    saveUninitialized: false,
    name: 'ngp.session', // Custom session name
    cookie: {
      secure: isProduction && process.env.FORCE_HTTPS !== 'false', // Only secure in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    rolling: true // Reset expiration on activity
  })
)

// Flash messages
app.use(flash())

// Authentication and session middleware
app.use((req, res, next) => {
  res.locals.success = req.flash('success')
  res.locals.error = req.flash('error')
  // Set authentication status for all views based on session
  res.locals.isAuthenticated = !!(
    req.session && req.session.isAuthenticated === true
  )
  res.locals.session = req.session
  res.locals.username =
    req.session && req.session.username ? req.session.username : null
  next()
})

// SEO middleware
app.use(setSEO)

// Routes
app.use('/', publicRoutes)
app.use('/admin', authRoutes)
app.use('/admin', adminRoutes)

// 404 handler
app.use((req, res) => {
  res.status(404).render('public/404', {
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist.'
  })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500)
  res.render('public/error', {
    title: 'Error',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong!'
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

module.exports = app
