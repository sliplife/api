const Bcrypt = require('bcrypt');
const JsonWebToken = require('jsonwebtoken');
const Boom = require('boom');

module.exports = ({
  getAuthenticatedUser: (request, reply) => {

    request.server.plugins.data.store().User
      .get(request.auth.credentials.user.id)
      .run()
      .then((user) => {

        delete user.password;
        return reply({ user });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  authenticate: (request, reply) => {

    request.server.plugins.data.store().User
      .filter({ email: request.payload.email })
      .run()
      .then((users) => {

        if (!users.length) {
          return reply(Boom.badRequest('Invalid email or password.'));
        }
        const authenticatedUser = users.pop();
        Bcrypt.compare(request.payload.password, authenticatedUser.password, (error, hash) => {

          if (error) {
            throw error;
          }
          if (!hash) {
            return reply(Boom.badRequest('Invalid email or password.'));
          }

          const authenticatedAt = new Date();
          const lastAuthenticatedAt = authenticatedUser.authenticatedAt || authenticatedAt;
          const user = {
            id: authenticatedUser.id,
            email: authenticatedUser.email,
            firstName: authenticatedUser.firstName,
            lastName: authenticatedUser.lastName,
            lastAuthenticatedAt
          };
          const token = JsonWebToken.sign({ user }, request.server.app.config.auth.jwt.secret);

          request.server.plugins.data.store().User
            .get(user.id)
            .update({ authenticatedAt })
            .run()
            .then(() => {

              return reply({ jwt: { token }, user });
            });
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  signup: (request, reply) => {

    const { email, password, verificationEmail } = request.payload;

    if (email !== verificationEmail) {
      const error = Boom.badRequest('Verification email address does not match.');
      error.output.payload.validation = {
        keys: ['verificationEmail']
      };
      return reply(error);
    }
    const User = request.server.plugins.data.store().User;
    User
      .filter({ email })
      .run()
      .then((users) => {

        if (users.length > 0) {
          const error = Boom.badRequest('Email address is already registered.');
          error.output.payload.validation = {
            keys: ['email', 'verificationEmail']
          };
          return reply(error);
        }
        Bcrypt.hash(password, 10, (hashError, hash) => {

          if (hashError) {
            throw hashError;
          }
          const user = new User({
            email,
            password: hash
          });
          user
            .save()
            .then(() => reply({ user }))
            .catch((error) => reply(Boom.badRequest(error)));
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  passwordReset: (request, reply) => {

    if (request.payload.password !== request.payload.verificationPassword) {
      const error = Boom.badRequest('Verification password does not match.');
      error.output.payload.validation = {
        keys: ['verificationPassword']
      };
      return reply(error);
    }
    request.server.plugins.data.store().Token
      .getJoin({ user: true })
      .filter({ token: request.payload.token })
      .limit(1)
      .run()
      .then((token) => {

        if (token.length === 0) {
          return reply(Boom.badRequest('Invalid or expired token.'));
        }
        const user = token[0].user;
        const password = request.payload.password;
        Bcrypt.hash(password, 10, (hashError, hash) => {

          if (hashError) {
            throw hashError;
          }

          request.server.plugins.data.store().User
            .get(user.id)
            .update({ password: hash })
            .run()
            .then(() => reply(user))
            .catch((error) => reply(Boom.badRequest(error)));
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
