const Capitalize = require('lodash/capitalize');

module.exports = (store, server) => {

  const Listing = store.createModel('listings', {
    active: store.type.boolean().default(false),
    amenities: store.type.array(),
    beam: store.type.number(),
    city: store.type.string(),
    clearance: store.type.number(),
    country: store.type.string(),
    createdAt: store.type.date().default(store.r.now()),
    description: store.type.string(),
    draw: store.type.number(),
    email: store.type.string(),
    expiresAt: store.type.date().default(store.r.now().add(86400)), // 1 day
    featured: store.type.boolean().default(false),
    id: store.type.string(),
    isNew: store.type.virtual().default(function () {

      const isNewTime = new Date();
      isNewTime.setDate(isNewTime.getDate() - 3); // 3 days
      return new Date(this.createdAt) > isNewTime;
    }),
    latitude: store.type.number(),
    length: store.type.number(),
    location: store.type.string().enum(['condo', 'home', 'marina', 'vacant_lot']),
    locationName: store.type.virtual().default(function () {

      return this.location.split('_').map(Capitalize).join(' ');
    }),
    longitude: store.type.number(),
    name: store.type.string(),
    phone: store.type.string(),
    price: store.type.string(),
    state: store.type.string(),
    street: store.type.string(),
    stripeChargeId: store.type.string(),
    terms: store.type.string().enum(['sale', 'rent']),
    termType: store.type.string().enum(['by_foot', 'flat_rate']),
    type: store.type.string().enum(['dock', 'dry_storage', 'mooring', 'slip']),
    typeName: store.type.virtual().default(function () {

      return this.type.split('_').map(Capitalize).join(' ');
    }),
    userId: store.type.string(),
    vhfChannel: store.type.string(),
    website: store.type.string(),
    zip: store.type.string()
  });

  return Listing;
};
