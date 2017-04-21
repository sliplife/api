const Path = require('path');
const Fs = require('fs');
const Yaml = require('js-yaml');
const Glob = require('glob');

const internals = {};
internals.loadYamlDoc = (docFile) => {

  return Yaml.safeLoad(Fs.readFileSync(Path.join(process.cwd(), 'app', docFile), 'utf8'));
};
internals.loadDefinitionsFile = (docFile) => internals.loadYamlDoc(docFile).definitions;
internals.loadResponsesFile = (docFile) => internals.loadYamlDoc(docFile).responses;
internals.getDocumentationFiles = () => {

  return {
    paths: Glob.sync('*/docs/routes.yml', { cwd: 'app' }),
    definitions: Glob.sync('*/docs/definitions.yml', { cwd: 'app' }),
    responses: Glob.sync('*/docs/responses.yml', { cwd: 'app' })
  };
};


// Define handler for this controller.
module.exports = ({
  index: (request, reply) => {

    // Find documentation.
    const documentation = internals.getDocumentationFiles();
    // API parts.
    const api = {
      swagger: '2.0',
      info: {
        title: 'SlipLife API',
        description: 'The api web service for sliplife.',
        version: '1.0.0'
      },
      schemes: [
        'http',
        'https'
      ],
      basePath: '/',
      securityDefinitions: {
        jwt: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header'
        }
      },
      produces: [
        'application/json'
      ],
      consumes: [
        'application/json',
        'application/x-www-form-urlencoded',
        'application/offset+octet-stream',
        'multipart/form-data'
      ]
    };
    api.info.host = request.info.host;
    api.info.host = (process.env.NODE_ENV !== 'production') ? 'api.sliplife.dev' : 'api.sliplife.com';
    api.paths = documentation.paths.map((docFile) => ({
      plugin: request.server.plugins.plugins.getDetails(docFile),
      yaml: internals.loadYamlDoc(docFile)
    }));
    const paths = {};
    // TODO: Improve this entire for each loop. It's too loopy!
    // Iterate over each of the documented paths.
    api.paths.forEach((swagger) => {
      // Store path's swagger yaml as path object.
      const swaggerPaths = swagger.yaml;
      // Iterate each path.
      for (const route in swaggerPaths) {
        // Store reference to the path's routes.
        const routes = swaggerPaths[route];
        // Iterate over each of the route's opeartions.
        for (const operation in routes) {
          // Does the operation method have assigned opeartionId?
          if (!routes[operation].operationId) {
            // No auto-assign using opeartion method as the operationId.
            routes[operation].operationId = operation;
            // Is it a "get" request with no route params?
            if (operation === 'get' && !route.match(/\{.*\}/)) {
              // Assume it's a route to "get all" resources.
              routes[operation].operationId = 'getAll';
            }
          }
          // Tag operation with plugin's namespace.
          routes[operation].tags = [swagger.plugin.package.namespace];
        }
      }
      // Assign enhanced path object to paths object.
      Object.assign(paths, swaggerPaths);
    });
    api.paths = paths;
    api.responses = documentation.responses.map((docFile) => internals.loadResponsesFile(docFile));
    const responses = {};
    api.responses.forEach((response) => Object.assign(responses, response));
    api.responses = responses;
    api.definitions = documentation.definitions.map((docFile) => internals.loadDefinitionsFile(docFile));
    const definitions = {};
    api.definitions.forEach((definition) => Object.assign(definitions, definition));
    api.definitions = definitions;
    // If forwarded by a local proxy then adjust the base path.
    if (request.headers['x-forwarded-for'] === '127.0.0.1') {
      api.basePath = '/api';
    }
    else {
      api.basePath = '/';
    }
    return reply(api);
  }
});
