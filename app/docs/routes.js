const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/docs',
    config: {
      auth: false,
      handler: internals.controller.index
    }
  }
];
