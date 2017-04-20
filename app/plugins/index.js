const Path = require('path');
const UpperFirst = require('lodash/upperFirst');
const CamelCase = require('lodash/camelCase');

const internals = {
  getNamespace: (packageName) => {

    const name = packageName;
    let namespace = [];
    namespace = [UpperFirst(CamelCase(name))];
    return namespace.filter(Boolean).join('.');
  }
};

const plugin = (sliplife, options, nextPlugin) => {

  sliplife.dependency(plugin.attributes.dependencies, (server, nextDependency) => {

    server.expose('getDetails', (name) => {
      // Get package name.
      name = name.split('/')[0] || Path.parse(name).name;
      // Build module details.
      const module = {
        package: { name, namespace: internals.getNamespace(name) }
      };
      return module;
    });
    nextDependency();
  });
  nextPlugin();
};

plugin.attributes = {
  name: 'plugins',
  dependencies: ['data']
};

exports.register = plugin;
