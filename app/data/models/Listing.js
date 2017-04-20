module.exports = (store, server) => {

  const Listing = store.createModel('listings', {
    id: store.type.string(),
    city: store.type.string(),
    state: store.type.string(),
    type: store.type.string().enum(['marina', 'rack', 'trailer']),
    userId: store.type.string()
  });

  return Listing;
};
