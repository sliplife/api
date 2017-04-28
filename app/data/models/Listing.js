module.exports = (store, server) => {

  const Listing = store.createModel('listings', {
    active: store.type.boolean().default(false),
    amenities: store.type.array(),
    city: store.type.string(),
    createdAt: store.type.date().default(store.r.now()),
    description: store.type.string(),
    featured: store.type.boolean().default(false),
    id: store.type.string(),
    state: store.type.string(),
    type: store.type.string().enum(['marina', 'rack', 'trailer']),
    userId: store.type.string(),
    stripeChargeId: store.type.string()
  });

  return Listing;
};
