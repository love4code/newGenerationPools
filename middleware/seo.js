// SEO helper middleware to set default SEO values
const setSEO = (req, res, next) => {
  res.locals.seo = res.locals.seo || {
    title: 'New Generation Pools - Premium Pool Services',
    description: 'New Generation Pools offers premium pool design, installation, and maintenance services.',
    keywords: [],
    canonicalUrl: '',
    ogImage: '',
    ogUrl: '',
    index: true
  };
  next();
};

module.exports = { setSEO };

