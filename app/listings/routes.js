const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/listings',
    config: {
      auth: false,
      handler: internals.controller.index
    }
  },
  {
    method: 'GET',
    path: '/listings/{id}',
    config: {
      auth: false,
      handler: internals.controller.get
    }
  },
  {
    method: 'POST',
    path: '/listings',
    handler: internals.controller.create
  },
  {
    method: 'PUT',
    path: '/listings/{id}',
    handler: internals.controller.update
  },
  {
    method: 'DELETE',
    path: '/listings/{id}',
    handler: internals.controller.delete
  }
];
