const Joi = require('joi');
const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/tokens',
    handler: internals.controller.index
  },
  {
    method: 'GET',
    path: '/tokens/{id}',
    config: {
      auth: false,
      handler: internals.controller.get
    }
  },
  {
    method: 'POST',
    path: '/tokens',
    config: {
      auth: false,
      handler: internals.controller.create,
      validate: {
        payload: {
          email: Joi.string().email().required()
        }
      }
    }
  },
  {
    method: 'PUT',
    path: '/tokens/{id}',
    handler: internals.controller.update
  },
  {
    method: 'DELETE',
    path: '/tokens/{id}',
    handler: internals.controller.delete
  }
];
