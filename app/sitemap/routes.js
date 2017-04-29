const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/sitemap.xml',
    config: {
      auth: false,
      handler: internals.controller.generateSitemap
    }
  }
];
