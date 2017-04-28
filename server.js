const Hapi = require('hapi');
const Glob = require('glob');
const Config = require('config');

const server = new Hapi.Server();

server.app.config = Config;
server.event({ channels: 'sliplife', name: 'register' });
server.connection({
  port: server.app.config.port,
  labels: ['api'],
  routes: {
    cors: {
      origin: ['*'],
      exposedHeaders: ['Upload-Offset']
    },
    payload: {
      allow: [
        'application/json',
        'application/x-www-form-urlencoded',
        'application/offset+octet-stream',
        'multipart/form-data'
      ]
    }
  }
});

const plugins = Glob.sync('*', { cwd: 'app', absolute: true });
for (const register of plugins) {
  const plugin = require(register);
  server.register(plugin, (error) => {

    if (error) {
      throw error;
    }
    server.emit({ channel: 'sliplife', name: 'register' }, plugin.register.attributes);
  });
}

server.start((error) => {

  if (error) {
    throw error;
  }
});
