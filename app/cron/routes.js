const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/cron/{taskName}',
    config: {
      auth: false,
      handler: internals.controller.runTask
    }
  }
];
