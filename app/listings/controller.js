const Boom = require('boom');
const Promise = require('bluebird');

module.exports = ({
  index: (request, reply) => {

    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 100;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const query = request.query.query || '';
    const filter = request.server.plugins.data.store().Listing
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((listing) => listing('email').match(`(?i).*${query}.*`));
    Promise.props({
      total: filter.count().execute(),
      listings: filter.skip(offset).limit(limit).run()
    })
    .then((pagination) => {

      reply({
        listings: pagination.listings,
        pagination: request.server.plugins.data.paginate({ total: pagination.total, limit, page })
      });
    })
    .catch((error) => reply(Boom.badRequest(error)));
  },
  get: (request, reply) => {

    const Listing = request.server.plugins.data.store().Listing;
    Listing
      .get(request.params.id)
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .run()
      .then((listing) => reply({ listing }))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  create: (request, reply) => {

    const Listing = request.server.plugins.data.store().Listing;
    const payloadInstance = new Listing({
      state: request.payload.state
    });
    payloadInstance
      .save()
      .then((listing) => reply({ listing }))
      .catch((listingError) => reply(Boom.badRequest(listingError)));
  },
  update: (request, reply) => {

    const Listing = request.server.plugins.data.store().Listing;
    Listing
      .get(id)
      .update(attributes)
      .run()
      .then((listing) => reply({ listing }))
      .catch((listingError) => reply(Boom.badRequest(listingError)));
  },
  delete: (request, reply) => {

    const Listing = request.server.plugins.data.store().Listing;
    Listing
      .get(request.params.id)
      .getJoin({ user: true })
      .run()
      .then((listing) => listing.deleteAll())
      .then((listing) => listing.purge())
      .then((listing) => reply({ listing }))
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
