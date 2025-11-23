// Admin authentication middleware
const requireAuth = (req, res, next) => {
  // Debug: Log session state
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - isAuthenticated:', req.session?.isAuthenticated);
  console.log('Auth check - username:', req.session?.username);
  
  // Check if user is authenticated via session
  if (req.session && req.session.isAuthenticated === true) {
    return next();
  }
  // Store the original URL to redirect back after login
  if (req.originalUrl && req.originalUrl !== '/admin/login') {
    req.session.returnTo = req.originalUrl;
  }
  res.redirect('/admin/login');
};

// Optional: Middleware to check if user is authenticated (doesn't redirect)
const isAuthenticated = (req, res, next) => {
  res.locals.isAuthenticated = !!(req.session && req.session.isAuthenticated);
  next();
};

module.exports = { requireAuth, isAuthenticated };

