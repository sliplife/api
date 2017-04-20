const Boom = require('boom');
const Promise = require('bluebird');
const Fs = require('fs-promise');
const Path = require('path');
const Tus = require('tus-node-server');
const TusStore = require('./tus/tusStore');
const TusPostHandler = require('./tus/tusPostHandler');

// Define handler for this controller.
module.exports = ({
  index: (request, reply) => {

    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 10;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const query = request.query.query || '';
    const filter = request.server.plugins.data.store().Upload
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((upload) => {

        return upload('fingerprint').match(`(?i).*${query}.*`)
          .or(upload('name').match(`(?i).*${query}.*`));
      });
    Promise.props({
      total: filter.count().execute(),
      uploads: filter.skip(offset).limit(limit).run()
    })
      .then((pagination) => {

        reply({
          uploads: pagination.uploads,
          pagination: request.server.plugins.data.paginate({ total: pagination.total, limit, page })
        });
      })
      .catch((error) => reply(Boom.badRequest(error)));
  },
  get: (request, reply) => {

    request.server.plugins.data.store().Upload
      .filter((upload) => {

        return upload('id').match(request.params.id)
          .or(upload('fingerprint').match(request.params.id));
      })
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .nth(0)
      .run()
      .then((upload) => reply({ upload }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  update: (request, reply) => {

    request.server.plugins.data.store().Upload
      .filter((upload) => {

        return upload('id').match(request.params.id)
          .or(upload('fingerprint').match(request.params.id));
      })
      .getJoin({ tags: true })
      .nth(0)
      .run()
      .then((upload) => upload.merge(request.payload).saveAll({ tags: true }))
      .then((upload) => reply({ upload }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  delete: (request, reply) => {

    const Upload = request.server.plugins.data.store().Upload;
    Upload
      .get(request.params.id)
      .run()
      .then((upload) => {

        const file = Path.join(process.cwd(), 'public', upload.path, upload.fingerprint);
        return Fs.unlink(file)
          .then(() => upload)
          .catch((error) => reply(Boom.badRequest(error)));
      })
      .then((upload) => upload.purge())
      .then((upload) => reply({ upload }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  // Handles POST, HEAD, PATCH & OPTIONS methods for TUS requests.
  tusHandler: (request, reply) => {

    const tusServer = new Tus.Server();
    tusServer.datastore = new TusStore({
      path: '/uploads',
      directory: Path.join(process.cwd(), 'public', 'uploads'),
      dataStore: request.server.plugins.data.store()
    });
    request.raw.req.app = request.server.app; // pass along app settings onto raw req.
    tusServer.handlers.POST = new TusPostHandler(tusServer.datastore, request.server.plugins.data.store());
    tusServer.handle(request.raw.req, request.raw.res);
  }
});
