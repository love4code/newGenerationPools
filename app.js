require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')
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
const mongoUri =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/newGenerationPools'
if (!process.env.MONGODB_URI && process.env.NODE_ENV === 'production') {
  console.error(
    'ERROR: MONGODB_URI environment variable is required in production!'
  )
  process.exit(1)
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err)
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'Fatal: Cannot connect to MongoDB in production. Exiting...'
      )
      process.exit(1)
    }
  })

// View engine setup
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Middleware
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// Trust proxy (required for Heroku)
app.set('trust proxy', 1)

// Domain and HTTPS redirect middleware (for production only)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const host = req.headers.host || ''
    const canonicalDomain = 'www.newgenerationpool.com'

    // Normalize host (remove port if present)
    const hostWithoutPort = host.split(':')[0].toLowerCase()

    // Check if it's the canonical domain (with or without www)
    const isCanonical =
      hostWithoutPort === canonicalDomain ||
      hostWithoutPort === 'newgenerationpool.com'

    // If not canonical, redirect to www version
    if (!isCanonical) {
      return res.redirect(301, `https://${canonicalDomain}${req.url}`)
    }

    // If non-www version, redirect to www
    if (hostWithoutPort === 'newgenerationpool.com') {
      return res.redirect(301, `https://${canonicalDomain}${req.url}`)
    }

    // Force HTTPS if not already using it
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${canonicalDomain}${req.url}`)
    }

    next()
  })
}

// adding logging to see whats going on
app.get('/', async (req, res, next) => {
  const start = Date.now()
  console.log('GET / start', { time: new Date().toISOString() })

  try {
    // Log each async step:
    console.log('GET /: fetching recent projects')
    const recentProjects = await Project.find().sort({ createdAt: -1 }).limit(4)

    console.log('GET /: fetching products')
    const products = await Product.find().limit(10)

    // Any other DB calls? Log before/after them too.

    console.log('GET /: rendering view')
    res.render('home', { recentProjects, products })
    console.log('GET / done in', Date.now() - start, 'ms')
  } catch (err) {
    console.error('GET / error', err)
    next(err)
  }
})

// Session configuration
const isProduction = process.env.NODE_ENV === 'production'
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    name: 'ngp.session', // Custom session name
    store: MongoStore.create({
      mongoUrl: mongoUri,
      touchAfter: 24 * 3600 // Lazy session update (24 hours)
    }),
    cookie: {
      secure: isProduction, // Secure cookies in production (HTTPS) - works with Heroku proxy
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
