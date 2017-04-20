const Path = require('path');
const Boom = require('boom');
const Promise = require('bluebird');
const Crypto = require('crypto');
const Render = require('consolidate');

module.exports = ({
  index: (request, reply) => {

    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const query = request.query.query || '';
    const filter = request.server.plugins.data.store().Token
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((token) => token('id').match(`(?i).*${query}.*`));
    Promise.props({
      total: filter.count().execute(),
      tokens: filter.skip(offset).limit(limit).run()
    })
      .then((pagination) => {

        reply({
          tokens: pagination.tokens,
          pagination: request.server.plugins.data.paginate({ total: pagination.total, limit, page })
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  get: (request, reply) => {

    request.server.plugins.data.store().Token
      .filter((token) => {

        return token('id').match(`(?i).*${request.params.id}.*`)
          .or(token('token').match(`(?i).*${request.params.id}.*`));
      })
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .limit(1)
      .run()
      .then((tokens) => {

        const token = tokens.pop();
        if (!token) {
          return reply(Boom.badRequest('The requested token is invalid.'));
        }
        reply({ token });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  create: (request, reply) => {

    delete request.payload.id;
    const generateToken = () => {

      return new Promise((resolve, reject) => {

        Crypto.randomBytes(32, (error, buffer) => {

          if (error) {
            return reject(error);
          }
          const token = buffer.toString('hex');
          resolve(token);
        });
      });
    };
    const sendRecoveryEmail = (to, token) => {

      return new Promise((resolve, reject) => {

        const template = Path.join(__dirname, 'views', 'email', 'password-recovery.dust');
        const context = {
          adminBaseUrl: `${request.headers['x-forwarded-proto'] || request.connection.info.protocol}://${request.info.hostname}/`,
          assetsBaseUrl: `${request.headers['x-forwarded-proto'] || request.connection.info.protocol}://${request.info.hostname}/assets/`,
          token
        };
        Render.dust(template, context, (error, html) => {

          if (error) {
            return reply(Boom.badRequest(error));
          }
          const email = {
            to,
            from: 'SlipLife <no-reply@sliplife.com>',
            subject: 'SlipLife Account Recovery Request',
            html
          };
          request.server.plugins.mail.mailer.sendMail(email, (mailError, body) => {

            if (mailError) {
              return reject(mailError);
            }
            resolve({ to, token, body });
          });
        });
      });
    };
    const email = request.payload.email;
    const User = request.server.plugins.data.store().User;
    User
      .filter({ email })
      .limit(1)
      .run()
      .then((users) => {

        if (users.length === 0) {
          return reply(Boom.badRequest('Email address not found.'));
        }
        const user = users[0];
        return generateToken()
          .then((cypto) => {

            const Token = request.server.plugins.data.store().Token;
            const payloadInstance = new Token({
              userId: user.id,
              token: cypto
            });
            return payloadInstance
              .save()
              .then((token) => sendRecoveryEmail(user.email, token.token))
              .catch((error) => reply(Boom.badRequest(error)));
          })
          .catch((error) => reply(Boom.badRequest(error)));
      })
      .then((recovery) => reply({ token: recovery.token }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  update: (request, reply) => {

    request.server.plugins.data.store().Token
      .get(request.params.id)
      .update(request.payload)
      .run()
      .then((token) => reply({ token }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  delete: (request, reply) => {

    const Token = request.server.plugins.data.store().Token;
    Token
      .get(request.params.id)
      .run()
      .then((token) => token.delete())
      .then((token) => reply({ token }))
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
