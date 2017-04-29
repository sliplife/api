const Boom = require('boom');
const Promise = require('bluebird');
const Fs = require('fs-promise');
const Path = require('path');
const DeleteEmpty = Promise.promisify(require('delete-empty'));
const internals = {
  tasks: {
    'deactivate-expired-listings': (request, reply) => {

      const taskName = request.params.taskName;
      const store = request.server.plugins.data.store();
      return store.Listing
        .filter((listing) => listing('active').eq(true))
        .filter((listing) => listing('expiresAt').lt(store.r.now()))
        .run()
        .then((listings) => Promise.all((listings).map((listing) => listing.merge({ active: false }).save())))
        .then((listings) => ({
          name: taskName,
          work: {
            listings
          }
        }));
    },
    'delete-stale-listings': (request, reply) => {

      const taskName = request.params.taskName;
      const store = request.server.plugins.data.store();
      return store.Listing
        .getJoin({ uploads: true })
        .filter((listing) => listing('active').eq(false))
        .filter((listing) => listing('expiresAt').lt(store.r.now().sub(86400 * 30))) // 30 days
        .run()
        .then((listings) => {

          return Promise.all((listings).map((listing) => {

            return Promise.all((listing.uploads).map((upload) => {

              const file = Path.join(process.cwd(), '..', upload.path, upload.getDirectoryPath());
              return Fs.unlink(file);
            }))
            .then(() => {

              const uploadsDirectory = Path.join(process.cwd(), '..', 'uploads');
              return DeleteEmpty(uploadsDirectory);
            })
            .then(() => listing.deleteAll())
            .then((listing) => listing.purge());
          }));
        })
        .then((listings) => ({
          name: taskName,
          work: {
            listings
          }
        }));
    }
  }
};

module.exports = ({
  runTask: (request, reply) => {

    const taskName = request.params.taskName;
    return internals.tasks[taskName](request, reply)
    .then((task) => reply({ task }))
    .catch((error) => reply(Boom.badRequest(error)));
  }
});
