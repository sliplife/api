const Joi = require('joi');
const internals = {
  controller: require('./controller')
};

module.exports = [
  {
    method: 'POST',
    path: '/signup',
    config: {
      auth: false,
      handler: internals.controller.signup,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          verificationEmail: Joi.string().email().required().label('verification email'),
          password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/).required()
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/auth',
    handler: internals.controller.getAuthenticatedUser
  },
  {
    method: 'POST',
    path: '/auth',
    config: {
      auth: false,
      handler: internals.controller.authenticate,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/).required()
        }
      }
    }
  },
  {
    method: 'PUT',
    path: '/auth',
    config: {
      auth: false,
      handler: internals.controller.passwordReset,
      validate: {
        payload: {
          password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/).required(),
          verificationPassword: Joi.string().regex(/[a-zA-Z0-9]{3,30}/).required().label('verification password'),
          token: Joi.string()
        }
      }
    }
  }
];
