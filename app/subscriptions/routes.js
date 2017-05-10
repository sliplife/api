const Joi = require('joi');
const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/subscriptions',
    config: {
      handler: internals.controller.index
    }
  },
  {
    method: 'POST',
    path: '/subscriptions',
    config: {
      auth: false,
      handler: internals.controller.create,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          description: Joi.string().required(),
          filter: Joi.object().required(),
          frequency: Joi.string().required()
        }
      }
    }
  }
];
