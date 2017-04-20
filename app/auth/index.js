const Bell = require('bell');
const HapiAuthJWT2 = require('hapi-auth-jwt2');
const internals = {
  routes: require('./routes')
};

const plugin = (sliplife, options, nextPlugin) => {

  sliplife.dependency(plugin.attributes.dependencies, (server, nextDependency) => {

    server.register([Bell, HapiAuthJWT2], (error) => {

      if (error) {
        throw error;
      }
      server.auth.strategy('jwt', 'jwt', {
        key: server.app.config.auth.jwt.secret,
        validateFunc: (decoded, request, callback) => callback(null, true),
        verifyOptions: {
          algorithms: [server.app.config.auth.jwt.algorithim]
        }
      });
      server.auth.default('jwt');
      server.select('api').route(internals.routes);
      nextDependency();
    });
  });
  nextPlugin();
};

plugin.attributes = {
  name: 'auth',
  dependencies: []
};

exports.register = plugin;
