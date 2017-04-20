const internals = {
  routes: require('./routes')
};

const plugin = (sliplife, options, nextPlugin) => {

  sliplife.dependency(plugin.attributes.dependencies, (server, nextDependency) => {

    server.select('api').route(internals.routes);
    nextDependency();
  });
  nextPlugin();
};

plugin.attributes = {
  name: 'uploads',
  dependencies: ['data']
};

exports.register = plugin;
