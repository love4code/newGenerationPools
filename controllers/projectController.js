const Project = require('../models/Project');
const Image = require('../models/Image');
const slugify = require('slugify');

// List all projects
exports.list = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('featuredImage')
      .sort({ createdAt: -1 });
    res.render('admin/projects/list', { title: 'Projects', projects });
  } catch (error) {
    console.error('Projects list error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load projects' });
  }
};

// Show create form
exports.createForm = async (req, res) => {
  try {
    const images = await Image.find().select('-originalData -thumbnailData -mediumData -largeData').sort({ createdAt: -1 });
    res.render('admin/projects/form', { title: 'Create Project', project: null, images });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load form' });
  }
};

// Create project
exports.create = async (req, res) => {
  try {
    const { title, shortDescription, description, featuredImage, images, showInPortfolio, status, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      req.flash('error', 'Title and description are required');
      const images = await Image.find().select('-originalData -thumbnailData -mediumData -largeData').sort({ createdAt: -1 });
      return res.render('admin/projects/form', { 
        title: 'Create Project', 
        project: null, 
        images,
        error: 'Title and description are required'
      });
    }
    
    const projectData = {
      title: title.trim(),
      shortDescription: shortDescription ? shortDescription.trim() : '',
      description: description.trim(),
      showInPortfolio: showInPortfolio === 'on',
      status: status || 'draft',
      seoTitle: seoTitle ? seoTitle.trim() : '',
      seoDescription: seoDescription ? seoDescription.trim() : '',
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()).filter(k => k) : [],
      seoCanonicalUrl: seoCanonicalUrl ? seoCanonicalUrl.trim() : '',
      seoIndex: seoIndex !== 'false'
    };

    if (featuredImage && featuredImage !== '') {
      projectData.featuredImage = featuredImage;
    } else {
      projectData.featuredImage = null;
    }
    
    if (images) {
      if (Array.isArray(images)) {
        projectData.images = images.filter(img => img && img !== '');
      } else if (images !== '') {
        projectData.images = [images];
      } else {
        projectData.images = [];
      }
    } else {
      projectData.images = [];
    }

    // Check for duplicate slug
    const existingProject = await Project.findOne({ slug: projectData.slug || slugify(projectData.title, { lower: true, strict: true }) });
    if (existingProject) {
      // If slug exists, append a number
      let counter = 1;
      let newSlug = slugify(projectData.title, { lower: true, strict: true }) + '-' + counter;
      while (await Project.findOne({ slug: newSlug })) {
        counter++;
        newSlug = slugify(projectData.title, { lower: true, strict: true }) + '-' + counter;
      }
      projectData.slug = newSlug;
    } else if (!projectData.slug) {
      projectData.slug = slugify(projectData.title, { lower: true, strict: true });
    }

    const project = new Project(projectData);
    await project.save();
    
    req.flash('success', 'Project created successfully');
    res.redirect('/admin/projects');
  } catch (error) {
    console.error('Create project error:', error);
    const errorMessage = error.message || 'Failed to create project';
    req.flash('error', errorMessage);
    
    // Re-render form with error and preserve input
    try {
      const images = await Image.find().select('-originalData -thumbnailData -mediumData -largeData').sort({ createdAt: -1 });
      res.render('admin/projects/form', { 
        title: 'Create Project', 
        project: null, 
        images,
        error: errorMessage,
        formData: req.body // Preserve form data
      });
    } catch (renderError) {
      console.error('Error rendering form:', renderError);
      res.redirect('/admin/projects/new');
    }
  }
};

// Show edit form
exports.editForm = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('images featuredImage');
    const images = await Image.find().select('-originalData -thumbnailData -mediumData -largeData').sort({ createdAt: -1 });
    res.render('admin/projects/form', { title: 'Edit Project', project, images });
  } catch (error) {
    console.error('Edit form error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load project' });
  }
};

// Update project
exports.update = async (req, res) => {
  try {
    const { title, shortDescription, description, featuredImage, images, showInPortfolio, status, seoTitle, seoDescription, seoKeywords, seoCanonicalUrl, seoIndex } = req.body;
    
    const projectData = {
      title,
      shortDescription,
      description,
      showInPortfolio: showInPortfolio === 'on',
      status: status || 'draft',
      seoTitle,
      seoDescription,
      seoKeywords: seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : [],
      seoCanonicalUrl,
      seoIndex: seoIndex !== 'false'
    };

    if (featuredImage) projectData.featuredImage = featuredImage;
    if (images) {
      projectData.images = Array.isArray(images) ? images : [images];
    }

    await Project.findByIdAndUpdate(req.params.id, projectData);
    
    req.flash('success', 'Project updated successfully');
    res.redirect('/admin/projects');
  } catch (error) {
    console.error('Update project error:', error);
    req.flash('error', 'Failed to update project');
    res.redirect(`/admin/projects/${req.params.id}/edit`);
  }
};

// Delete project
exports.delete = async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    req.flash('success', 'Project deleted successfully');
    res.redirect('/admin/projects');
  } catch (error) {
    console.error('Delete project error:', error);
    req.flash('error', 'Failed to delete project');
    res.redirect('/admin/projects');
  }
};

