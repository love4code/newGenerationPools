# New Generation Pools - CMS Web Application

A full-featured CMS-style web application built with Node.js, Express, Mongoose, EJS, and Bootstrap 5.

## Features

- **Public Website**: Modern, responsive frontend with Bootstrap 5
- **Admin Backend**: Comprehensive CMS for managing content
- **Media Library**: Image upload with automatic resizing (thumbnail, medium, large)
- **SEO Support**: Custom meta tags, OpenGraph, and canonical URLs for projects and services
- **Portfolio Management**: Display projects in a responsive grid
- **Contact Form**: Save messages to database with optional email notifications

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Templates**: EJS
- **Styling**: Bootstrap 5
- **Image Processing**: Sharp
- **File Upload**: Multer
- **Authentication**: Express Sessions

## Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` (if it exists) or create a `.env` file
   - Configure the following variables:
     ```
     MONGODB_URI=mongodb://localhost:27017/newGenerationPools
     PORT=3000
     NODE_ENV=development
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=changeme123
     SESSION_SECRET=your-secret-session-key-change-this-in-production
     ```

4. **Start MongoDB** (if running locally):
   ```bash
   # Make sure MongoDB is running on your system
   ```

5. **Run the application**:
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

6. **Access the application**:
   - Public site: http://localhost:3000
   - Admin panel: http://localhost:3000/admin/login

## Project Structure

```
newGenerationPools/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── .gitignore
├── models/                # Mongoose models
│   ├── Image.js
│   ├── Project.js
│   ├── Service.js
│   ├── ContactMessage.js
│   ├── User.js
│   └── GlobalSettings.js
├── controllers/           # Business logic
│   ├── adminController.js
│   ├── projectController.js
│   ├── serviceController.js
│   ├── mediaController.js
│   ├── publicController.js
│   └── authController.js
├── routes/                # Express routes
│   ├── admin.js
│   ├── auth.js
│   └── public.js
├── middleware/            # Custom middleware
│   ├── auth.js
│   ├── upload.js
│   └── seo.js
├── views/                 # EJS templates
│   ├── admin/
│   ├── public/
│   └── partials/
└── public/                # Static files
    ├── uploads/           # Uploaded images
    ├── css/
    └── js/
```

## Admin Features

### Dashboard
- Overview statistics (projects, services, portfolio items, media)
- Recent projects and uploads

### Projects Management
- Create, edit, delete projects
- Set featured image and attach multiple images
- SEO fields (title, description, keywords, canonical URL, index flag)
- Status: draft/published
- Show in portfolio toggle

### Services Management
- Create, edit, delete services
- Icon and hero image selection
- Display order and active/inactive status
- Full SEO support

### Media Library
- Upload images (automatically creates 3 sizes)
- Edit metadata (title, alt text, category)
- Delete images
- Grid view with thumbnails

## Public Pages

- **Home**: Hero section, services overview, featured projects
- **Services**: Grid listing of all active services
- **Service Detail**: Individual service pages with SEO
- **Portfolio**: Grid of all published portfolio projects
- **Project Detail**: Individual project pages with gallery and SEO
- **Contact**: Contact form with email notifications

## Image Processing

Uploaded images are automatically processed into three sizes:
- **Thumbnail**: 150x150px (for admin previews, thumbnails)
- **Medium**: 800px wide (for cards, listings)
- **Large**: 1600px wide (for hero sections, detail pages)

Images are stored in:
- `public/uploads/original/` - Original files
- `public/uploads/thumbnails/` - Thumbnails
- `public/uploads/medium/` - Medium size
- `public/uploads/large/` - Large size

## SEO Features

Each project and service supports:
- Custom SEO title
- Meta description
- Keywords (comma-separated)
- Canonical URL
- Index/noindex control
- OpenGraph tags (title, description, image, URL)

## Authentication

Admin authentication uses:
- Simple username/password from `.env` file
- Session-based authentication
- Protected admin routes

## Contact Form

- Saves messages to database
- Optional email notifications (configure SMTP in `.env`)
- Fields: Name, Email, Phone, Message

## Development

- Uses `nodemon` for auto-restart during development
- Morgan for request logging
- Error handling middleware
- Flash messages for user feedback

## Production Considerations

1. **Security**:
   - Change default admin credentials
   - Use strong `SESSION_SECRET`
   - Enable HTTPS
   - Set `NODE_ENV=production`

2. **Database**:
   - Use MongoDB Atlas or production MongoDB instance
   - Update `MONGODB_URI` in `.env`

3. **File Storage**:
   - Consider cloud storage (AWS S3, Cloudinary) for production
   - Update upload middleware accordingly

4. **Email**:
   - Configure production SMTP settings
   - Use environment variables for credentials

## License

ISC

