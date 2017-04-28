const Joi = require('joi');
const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'GET',
    path: '/stripe',
    handler: internals.controller.hooks
  },
  {
    method: 'POST',
    path: '/stripe/charges',
    config: {
      handler: internals.controller.createCharge,
      validate: {
        payload: {
          stripeTokenId: Joi.string().required(),
          listingId: Joi.string().required()
        }
      }
    }
  }
];
