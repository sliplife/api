const Boom = require('boom');
const Promise = require('bluebird');
const Bcrypt = require('bcrypt');
const JsonWebToken = require('jsonwebtoken');

module.exports = ({
  index: (request, reply) => {

    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 100;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const query = request.query.query || '';
    const filter = request.server.plugins.data.store().User
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((user) => user('email').match(`(?i).*${query}.*`));
    Promise.props({
      total: filter.count().execute(),
      users: filter.skip(offset).limit(limit).run()
    })
      .then((pagination) => {

        reply({
          users: pagination.users,
          pagination: request.server.plugins.data.paginate({ total: pagination.total, limit, page })
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  get: (request, reply) => {

    request.server.plugins.data.store().User
      .get(request.params.id)
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .run()
      .then((user) => {

        delete user.password;
        return reply({ user });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  create: (request, reply) => {

    delete request.payload.id;

    const User = request.server.plugins.data.store().User;
    User
      .filter({ email: request.payload.email })
      .run()
      .then((users) => {

        if (users.length > 0) {
          return reply(Boom.badRequest('Email address is already registered.'));
        }
        Bcrypt.hash(request.payload.password, 10, (error, hash) => {

          if (error) {
            return reply(Boom.badRequest(error));
          }
          const payloadInstance = new User({
            email: request.payload.email,
            password: hash
          });
          payloadInstance
            .save()
            .then((user) => {

              return reply({ user });
            })
            .catch((userError) => reply(Boom.badRequest(userError)));
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  update: (request, reply) => {

    const body = request.payload;
    const password = body.password;

    const updatePassword = () => {

      return new Promise((resolve, reject) => {

        Bcrypt.hash(password, 10, (error, hash) => {

          if (error) {
            reject(error);
          }
          resolve(hash);
        });
      });
    };

    const updateUser = (id, attributes = {}) => {

      return request.server.plugins.data.store().User
        .get(id)
        .update(attributes)
        .run()
        .then((user) => {

          const response = reply({ user });
          // Reissue JWT if update is for authenticated user.
          if (request.auth.isAuthenticated && request.auth.credentials.user.id === user.id) {
            const jwt = request.auth.credentials;
            jwt.user.stripeId = user.stripeId;
            const token = JsonWebToken.sign(jwt, request.server.app.auth.jwt.secret);
            response.header('token', token);
          }
          return response;
        })
        .catch((userError) => reply(Boom.badRequest(userError)));
    };

    const { id } = request.params;

    if (!password || password.length === 0) {
      delete body.password;
      return updateUser(id, body);
    }

    updatePassword()
      .then((hash) => {

        body.password = hash;
        return updateUser(id, body);
      })
      .catch((userError) => reply(Boom.badRequest(userError)));


  },
  delete: (request, reply) => {

    const User = request.server.plugins.data.store().User;
    User
      .get(request.params.id)
      .getJoin({ key: true, token: true })
      .run()
      .then((user) => {

        if (user.id === request.auth.credentials.user.id) {
          throw new Error('You can not delete yourself.');
        }
        return user.deleteAll();
      })
      .then((user) => user.purge())
      .then((user) => reply({ user }))
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
