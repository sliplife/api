const Boom = require('boom');
const Promise = require('bluebird');
const NodeGeocoder = require('node-geocoder');

module.exports = ({
  index: (request, reply) => {

    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 100;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const query = request.query.query || '';
    const filter = request.server.plugins.data.store().Listing
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((listing) => listing('active').eq(true))
      .filter((listing) => {

        return listing('type').match(`(?i).*${query}.*`)
          .or(listing('state').match(`(?i).*${query}.*`))
          .or(listing('city').match(`(?i).*${query}.*`))
          .or(listing('description').match(`(?i).*${query}.*`));
      });
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

    const getGeoCoordinatesFromAddress = (address) => {

      const geocoder = NodeGeocoder({
        provider: 'google',
        httpAdapter: 'https',
        apiKey: request.server.app.config.google.geoKey
      });
      return geocoder.geocode(address);
    };

    const Listing = request.server.plugins.data.store().Listing;
    const uploads = request.payload.uploads;
    delete request.payload.uploads;
    const payloadInstance = new Listing(request.payload);
    payloadInstance.userId = request.auth.credentials.user.id;
    payloadInstance
      .save()
      .then((listing) => {

        return Promise.all((uploads).map((uploadId) => {

          const Upload = request.server.plugins.data.store().Upload;
          return Upload
            .filter((upload) => upload('fingerprint').match(uploadId))
            .nth(0)
            .run()
            .then((upload) => upload.merge({ listingId: listing.id }).save());
        }))
        .then(() => listing);
      })
      .then((listing) => {

        return getGeoCoordinatesFromAddress({
          address: listing.street,
          country: listing.country,
          zipcode: listing.zip
        })
        .then((geo) => {

          const { latitude, longitude } = geo[0] || geo;
          return listing.merge({ latitude, longitude }).save();
        });
      })
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
