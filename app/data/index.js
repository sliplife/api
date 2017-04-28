const Config = require('config');
const DotProp = require('dot-prop');
const Thinky = require('thinky');
const internals = {
  pluginModels: [],
  getJoinObject: (dotPaths = '') => {
    // Convert from a dot notation to join format thinky can use.
    // Example
    // Input: storage,theme.storage
    // Ouput: { storage: true, theme: { storage: true } };
    const relationships = {};
    const joins = dotPaths.split(',');
    joins.forEach((join) => DotProp.set(relationships, join, true));
    return relationships;
  },
  paginate: (data) => {

    const totalItems = data.total;
    let itemsPerPage = data.limit;
    let currentPage = data.page;
    // Items per page must be at least one
    itemsPerPage = Math.max(1, itemsPerPage);
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    // Current page must be at least one
    currentPage = Math.max(1, currentPage);
    // Determine previous/next pages
    const previousPage = currentPage > 1 ? currentPage - 1 : null;
    const nextPage = currentPage < totalPages ? currentPage + 1 : null;
    return {
      currentPage,
      itemsPerPage,
      nextPage,
      previousPage,
      totalItems,
      totalPages
    };
  },
  store: Thinky({
    host: Config.rethinkdb.host,
    port: Config.rethinkdb.port,
    db: Config.rethinkdb.database,
    username: Config.rethinkdb.username,
    password: Config.rethinkdb.password,
    buffer: Config.rethinkdb.buffer,
    max: Config.rethinkdb.max,
    silent: Config.rethinkdb.silent,
    timeout: Config.rethinkdb.timeout,
    discovery: Config.rethinkdb.discovery
  })
};

// Plugin.
const plugin = (server, options, nextPlugin) => {

  // Store.
  const store = internals.store;

  // Models.
  store.Listing = require('./models/Listing')(store, server);
  store.Token = require('./models/Token')(store, server);
  store.Upload = require('./models/Upload')(store, server);
  store.User = require('./models/User')(store, server);
  // Relationships.
  store.Listing.belongsTo(store.User, 'user', 'userId', 'id');
  store.Listing.hasMany(store.Upload, 'uploads', 'id', 'listingId');
  store.Token.belongsTo(store.User, 'user', 'userId', 'id');
  store.User.hasOne(store.Token, 'token', 'id', 'userId');
  store.User.hasMany(store.Listing, 'listings', 'id', 'userId');

  server.expose('store', () => store);
  server.expose('getJoinObject', internals.getJoinObject);
  server.expose('paginate', internals.paginate);
  nextPlugin();
};

plugin.attributes = {
  name: 'data',
  dependencies: []
};

exports.register = plugin;
