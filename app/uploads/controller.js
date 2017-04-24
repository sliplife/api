const _ = require('lodash');
const Boom = require('boom');
const { Caman } = require('caman');
const Promise = require('bluebird');
const Fs = require('fs-promise');
const Path = require('path');
const Tus = require('tus-node-server');
const TusStore = require('./tus/tusStore');
const TusPostHandler = require('./tus/tusPostHandler');
const Sharp = require('sharp');
const SmartCrop = require('smartcrop-sharp');
const ImageMin = require('imagemin');
const ImageminMozjpeg = require('imagemin-mozjpeg');
const ImageminPngquant = require('imagemin-pngquant');

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
      .nth(0)
      .run()
      .then((upload) => upload.merge(request.payload).save())
      .then((upload) => reply({ upload }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  delete: (request, reply) => {

    const Upload = request.server.plugins.data.store().Upload;
    Upload
      .get(request.params.id)
      .run()
      .then((upload) => {

        const file = Path.join(process.cwd(), '..', upload.path, upload.fingerprint);
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
      directory: Path.join(process.cwd(), '..', 'uploads'),
      dataStore: request.server.plugins.data.store()
    });
    request.raw.req.app = request.server.app; // pass along app settings onto raw req.
    tusServer.handlers.POST = new TusPostHandler(tusServer.datastore, request.server.plugins.data.store());
    tusServer.handle(request.raw.req, request.raw.res);
  },
  dynamicResizeHandler: (request, reply) => {

    const params = request.query;
    const readFileBuffer = (filePath) => Fs.readFile(filePath);
    const orientate = (buffer) => Sharp(buffer).rotate().withMetadata().toBuffer();
    const resize = (buffer) => {

      const width = parseInt(params.width || 0, 10);
      const height = parseInt(params.height || 0, 10);
      if ([width, height].includes(0)) {
        return Promise.resolve(buffer);
      }
      return SmartCrop
        .crop(buffer, { width, height })
        .then(({ topCrop }) => {

          return Sharp(buffer)
            .quality(100)
            .extract({ width: topCrop.width, height: topCrop.height, left: topCrop.x, top: topCrop.y })
            .withMetadata()
            .resize(width, height)
            .toBuffer();
        });
    };
    const filter = (buffer) => {

      return new Promise((resolve, reject) => {

        if (_.isEmpty(params.filter)) {
          return resolve(Promise.resolve(buffer));
        }
        Caman(buffer, function () {
          /* Default presets that are supported by caman:
          vintage, lomo, clarity, sinCity, sunrise, crossProcess, orangePeel,
          love, grungy, jarques, pinhole, oldBoot, glowingSun, hazyDays,
          herMajesty, nostalgia, hemingway, concentrate */
          this[params.filter]();
          this.render(() => {

            const data = this.toBase64().split(',')[1]; // <-- drop `data:image/png;base64,` from the encoded string.
            const image = new Buffer(data, 'base64');
            resolve(Promise.resolve(image));
          });
        });
      });
    };
    const optimize = (buffer) => {

      return ImageMin.buffer(buffer, {
        plugins: [
          ImageminMozjpeg(),
          ImageminPngquant({ quality: '65-80' })
        ]
      });
    };

    request.server.plugins.data.store().Upload
      .filter({ fingerprint: request.params.fingerprint })
      .limit(1)
      .nth(0)
      .run()
      .then((upload) => {

        return readFileBuffer(Path.join(process.cwd(), '..', upload.path, upload.fingerprint))
          .then((buffer) => orientate(buffer))
          .then((buffer) => resize(buffer))
          .then((buffer) => filter(buffer))
          .then((buffer) => optimize(buffer))
          .then((buffer) => reply(buffer).encoding('base64').type(upload.type))
          .catch((error) => reply(Boom.badRequest(error)));
      })
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
