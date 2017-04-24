const Joi = require('joi');
const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/uploads',
    handler: internals.controller.index
  },
  {
    method: 'GET',
    path: '/uploads/{id}',
    config: {
      auth: false,
      handler: internals.controller.get
    }
  },
  {
    method: 'GET',
    path: '/uploads/{id}/raw',
    config: {
      auth: false,
      handler: internals.controller.dynamicResizeHandler
    }
  },
  {
    method: 'POST',
    path: '/uploads',
    config: {
      auth: false,
      handler: internals.controller.tusHandler
    }
  },
  {
    method: 'PATCH',
    path: '/uploads/{id}',
    config: {
      auth: false,
      handler: internals.controller.tusHandler,
      payload: {
        output: 'stream',
        parse: false,
        maxBytes: 10485760
      }
    }
  },
  {
    method: 'PUT',
    path: '/uploads/{id}',
    config: {
      handler: internals.controller.update,
      validate: {
        payload: Joi.object({
          listingId: Joi.string(),
          name: Joi.string(),
          description: Joi.string(),
          tags: Joi.array()
        }).options({ stripUnknown: true })
      }
    }
  },
  {
    method: 'DELETE',
    path: '/uploads/{id}',
    handler: internals.controller.delete
  },
  {
    method: 'OPTIONS',
    path: '/uploads/{id}',
    config: {
      auth: false,
      handler: internals.controller.tusHandler
    }
  }
];
