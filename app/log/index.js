const Good = require('good');

const plugin = (sliplife, options, nextPlugin) => {
  // Ignore in test. Keeps console clear for reading test results.
  if (process.env.NODE_ENV === 'test') {
    return nextPlugin();
  }
  sliplife.on({ channels: 'sliplife', name: 'register' }, (pluginName) => {

    sliplife.log(['sliplife', 'register'], pluginName);
  });
  sliplife.register(
    [
      {
        register: Good,
        options: {
          ops: {
            interval: 1000
          },
          reporters: {
            console: [
              { module: 'good-squeeze', name: 'Squeeze', args: [{ log: '*', response: '*' }] },
              { module: 'good-console' },
              'stdout'
            ]
          }
        }
      }
    ],
    (error) => {

      if (error) {
        throw error;
      }
      nextPlugin();
    }
  );
};

plugin.attributes = {
  name: 'log',
  dependencies: []
};

exports.register = plugin;
