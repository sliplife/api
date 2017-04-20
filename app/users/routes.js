const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/users',
    handler: internals.controller.index
  },
  {
    method: 'GET',
    path: '/users/{id}',
    handler: internals.controller.get
  },
  {
    method: 'POST',
    path: '/users',
    handler: internals.controller.create
  },
  {
    method: 'PUT',
    path: '/users/{id}',
    handler: internals.controller.update
  },
  {
    method: 'DELETE',
    path: '/users/{id}',
    handler: internals.controller.delete
  }
];
