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
          beam: Joi.number().positive().required(),
          city: Joi.string().required(),
          clearance: Joi.number().positive().optional(),
          country: Joi.string().required(),
          description: Joi.string().required(),
          draw: Joi.number().positive().required(),
          email: Joi.string().email().required(),
          length: Joi.number().positive().required(),
          location: Joi.string().required(),
          name: Joi.string(),
          phone: Joi.string(),
          price: Joi.number().positive().required(),
          uploads: Joi.array().min(1).required(),
          state: Joi.string().required(),
          street: Joi.string().required(),
          terms: Joi.string().required(),
          termType: Joi.string().required(),
          type: Joi.string().required(),
          vhfChannel: Joi.string().allow('').optional(),
          website: Joi.string().allow('').optional(),
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
