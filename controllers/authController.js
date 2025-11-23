const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Show login form
exports.loginForm = (req, res) => {
  if (req.session && req.session.isAuthenticated) {
    return res.redirect('/admin');
  }
  res.render('admin/login', { title: 'Admin Login' });
};

// Handle login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if using .env credentials
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        // Set session data
        req.session.isAuthenticated = true;
        req.session.username = username;
        req.session.loginTime = Date.now();
        
        // Save session before redirect
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            req.flash('error', 'Login failed - session error');
            return res.redirect('/admin/login');
          }
          
          // Redirect to original URL or admin dashboard
          const returnTo = req.session.returnTo || '/admin';
          delete req.session.returnTo;
          res.redirect(returnTo);
        });
        return;
      }
    }

    // Check database for user
    const user = await User.findOne({ username });
    if (user && await user.comparePassword(password)) {
      // Set session data
      req.session.isAuthenticated = true;
      req.session.username = username;
      req.session.userId = user._id.toString();
      req.session.loginTime = Date.now();
      
      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          req.flash('error', 'Login failed - session error');
          return res.redirect('/admin/login');
        }
        
        // Redirect to original URL or admin dashboard
        const returnTo = req.session.returnTo || '/admin';
        delete req.session.returnTo;
        res.redirect(returnTo);
      });
      return;
    }

    req.flash('error', 'Invalid username or password');
    res.redirect('/admin/login');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Login failed');
    res.redirect('/admin/login');
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
};

