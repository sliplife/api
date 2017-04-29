const Boom = require('boom');
const Promise = require('bluebird');
const Render = require('consolidate');
const Path = require('path');
const Dust = require('dustjs-linkedin');
const DustIntl = require('dust-intl');
DustIntl.registerWith(Dust);

module.exports = ({
  generateSitemap: (request, reply) => {

    const renderSitemapTemplate = (context = {}) => {

      const template = Path.join(__dirname, 'views', 'sitemap.dust');
      const render = Promise.promisify(Render.dust);
      return render(template, context);
    };
    const getAllActiveListings = () => {

      const store = request.server.plugins.data.store();
      return store.Listing
        .filter((listing) => listing('active').eq(true))
        .run();
    };

    return getAllActiveListings()
      .then((listings) => renderSitemapTemplate({ listings, now: new Date() }))
      .then((sitemap) => reply(sitemap))
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
