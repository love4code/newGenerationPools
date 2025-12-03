const GlobalSettings = require('../models/GlobalSettings');
const Image = require('../models/Image');

// Show settings form
exports.show = async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    const images = await Image.find().select('-originalData -thumbnailData -mediumData -largeData').sort({ createdAt: -1 }).allowDiskUse(true);
    res.render('admin/settings', { 
      title: 'Settings', 
      settings,
      images
    });
  } catch (error) {
    console.error('Settings show error:', error);
    res.status(500).render('admin/error', { error: 'Failed to load settings' });
  }
};

// Update settings
exports.update = async (req, res) => {
  try {
    const {
      siteName,
      defaultMetaTitle,
      defaultMetaDescription,
      defaultOpenGraphImage,
      contactEmail,
      contactPhone,
      companyName,
      companyAddressStreet,
      companyAddressCity,
      companyAddressState,
      companyAddressZip,
      companyAddressCountry,
      facebook,
      instagram,
      twitter,
      linkedin,
      themePreset,
      primaryColor,
      secondaryColor,
      navbarColor,
      footerColor,
      fontFamily
    } = req.body;

    const settings = await GlobalSettings.getSettings();

    // Update basic settings
    settings.siteName = siteName || settings.siteName;
    settings.defaultMetaTitle = defaultMetaTitle || settings.defaultMetaTitle;
    settings.defaultMetaDescription = defaultMetaDescription || settings.defaultMetaDescription;
    settings.contactEmail = contactEmail || settings.contactEmail;
    settings.contactPhone = contactPhone || settings.contactPhone;
    settings.companyName = companyName || settings.companyName;

    // Update address
    if (settings.companyAddress) {
      settings.companyAddress.street = companyAddressStreet || settings.companyAddress.street;
      settings.companyAddress.city = companyAddressCity || settings.companyAddress.city;
      settings.companyAddress.state = companyAddressState || settings.companyAddress.state;
      settings.companyAddress.zip = companyAddressZip || settings.companyAddress.zip;
      settings.companyAddress.country = companyAddressCountry || settings.companyAddress.country;
    } else {
      settings.companyAddress = {
        street: companyAddressStreet || '',
        city: companyAddressCity || '',
        state: companyAddressState || '',
        zip: companyAddressZip || '',
        country: companyAddressCountry || ''
      };
    }

    // Update social links
    if (settings.socialLinks) {
      settings.socialLinks.facebook = facebook || settings.socialLinks.facebook;
      settings.socialLinks.instagram = instagram || settings.socialLinks.instagram;
      settings.socialLinks.twitter = twitter || settings.socialLinks.twitter;
      settings.socialLinks.linkedin = linkedin || settings.socialLinks.linkedin;
    } else {
      settings.socialLinks = {
        facebook: facebook || '',
        instagram: instagram || '',
        twitter: twitter || '',
        linkedin: linkedin || ''
      };
    }

    // Theme presets
    const themePresets = {
      default: {
        primaryColor: '#0d6efd',
        secondaryColor: '#6c757d',
        navbarColor: '#212529',
        footerColor: '#2c3e50'
      },
      ocean: {
        primaryColor: '#0066cc',
        secondaryColor: '#4da6ff',
        navbarColor: '#003366',
        footerColor: '#004080'
      },
      sky: {
        primaryColor: '#3399ff',
        secondaryColor: '#66b3ff',
        navbarColor: '#1a5490',
        footerColor: '#2d6ba3'
      },
      navy: {
        primaryColor: '#1e3a8a',
        secondaryColor: '#3b82f6',
        navbarColor: '#0f172a',
        footerColor: '#1e293b'
      },
      teal: {
        primaryColor: '#0d9488',
        secondaryColor: '#14b8a6',
        navbarColor: '#0f172a',
        footerColor: '#134e4a'
      }
    };

    // Update theme
    if (themePreset && themePreset !== 'custom' && themePresets[themePreset]) {
      // Apply preset
      settings.theme = {
        preset: themePreset,
        ...themePresets[themePreset],
        fontFamily: fontFamily || (settings.theme ? settings.theme.fontFamily : 'system-ui, -apple-system, sans-serif')
      };
    } else {
      // Use custom colors
      if (settings.theme) {
        settings.theme.preset = themePreset || 'custom';
        settings.theme.primaryColor = primaryColor || settings.theme.primaryColor;
        settings.theme.secondaryColor = secondaryColor || settings.theme.secondaryColor;
        settings.theme.navbarColor = navbarColor || settings.theme.navbarColor;
        settings.theme.footerColor = footerColor || settings.theme.footerColor;
        settings.theme.fontFamily = fontFamily || settings.theme.fontFamily;
      } else {
        settings.theme = {
          preset: themePreset || 'custom',
          primaryColor: primaryColor || '#0d6efd',
          secondaryColor: secondaryColor || '#6c757d',
          navbarColor: navbarColor || '#212529',
          footerColor: footerColor || '#2c3e50',
          fontFamily: fontFamily || 'system-ui, -apple-system, sans-serif'
        };
      }
    }

    // Update OpenGraph image if provided
    if (defaultOpenGraphImage) {
      settings.defaultOpenGraphImage = defaultOpenGraphImage;
    }

    settings.updatedAt = Date.now();
    await settings.save();

    req.flash('success', 'Settings updated successfully');
    res.redirect('/admin/settings');
  } catch (error) {
    console.error('Update settings error:', error);
    req.flash('error', 'Failed to update settings');
    res.redirect('/admin/settings');
  }
};

