const Joi = require('joi');
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
    config: {
      handler: internals.controller.create,
      validate: {
        payload: {
          amenities: Joi.array().optional(),
          city: Joi.string().required(),
          country: Joi.string().required(),
          description: Joi.string().required(),
          location: Joi.string().required(),
          price: Joi.string().required(),
          uploads: Joi.array().min(1).required(),
          state: Joi.string().required(),
          street: Joi.string().required(),
          terms: Joi.string().required(),
          termType: Joi.string().required(),
          type: Joi.string().required(),
          zip: Joi.string().required()
        }
      }
    }
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
