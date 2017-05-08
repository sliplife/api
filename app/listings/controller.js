const Boom = require('boom');
const Promise = require('bluebird');
const NodeGeocoder = require('node-geocoder');
const PhoneNumberFormat = require('google-libphonenumber').PhoneNumberFormat;
const PhoneNumberUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

module.exports = ({
  index: (request, reply) => {

    const store = request.server.plugins.data.store();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 100;
    const offset = (page - 1 < 1) ? 0 : (page * limit) - limit;
    const { query, terms, type, location, state, city } = request.query;
    const filter = store.Listing
      .getJoin(request.server.plugins.data.getJoinObject(request.query.with))
      .filter((listing) => listing('active').eq(true))
      .filter((listing) => {

        if (!query) {
          return listing;
        }
        // Query string
        return listing('zip').match(`(?i).*${query}.*`)
          .or(listing('street').match(`(?i).*${query}.*`))
          .or(listing('description').match(`(?i).*${query}.*`))
          .or(listing('country').match(`(?i).*${query}.*`))
          .or(listing('amenities').contains((row) => row.match(`(?i).*${query}.*`)));
      })
      .filter((listing) => {

        if (!terms) {
          return listing;
        }
        // Terms
        return listing('terms').eq(terms);
      })
      .filter((listing) => {

        if (!type) {
          return listing;
        }
        // Type
        return listing('type').eq(type);
      })
      .filter((listing) => {

        if (!location) {
          return listing;
        }
        // Location
        return listing('location').eq(location);
      })
      .filter((listing) => {

        if (!state) {
          return listing;
        }
        // State
        return listing('state').eq(state);
      })
      .filter((listing) => {

        if (!city) {
          return listing;
        }
        // City
        return listing('city').match(city);
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

    const store = request.server.plugins.data.store();
    const Listing = store.Listing;
    const uploads = request.payload.uploads;
    delete request.payload.uploads;
    const payloadInstance = new Listing(request.payload);
    payloadInstance.userId = request.auth.credentials.user.id;
    payloadInstance.phone = PhoneNumberUtil.format(PhoneNumberUtil.parse(payloadInstance.phone, payloadInstance.country), PhoneNumberFormat.INTERNATIONAL);
    payloadInstance
      .save()
      .then((listing) => Listing.get(listing.id).getJoin({ user: true }).run())
      .then((listing) => {

        return Promise.all((uploads).map((uploadId) => {

          const Upload = store.Upload;
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
      .then((listing) => {

        if (!listing.user.freeCredits) {
          return listing;
        }

        return listing
          .merge({
            active: true,
            expiresAt: store.r.now().add(86400 * 30) // 30 days
          })
          .save()
          .then(() => {

            const User = store.User;
            return User.get(listing.user.id)
              .update({ freeCredits: listing.user.freeCredits - 1 })
              .run()
              .then(() => listing);
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
