module.exports = (store, server) => {

  const User = store.createModel('users', {
    createdAt: store.type.date().default(store.r.now()),
    email: store.type.string(),
    freeCredits: store.type.number().default(1),
    id: store.type.string(),
    password: store.type.string(),
    scope: store.type.array(),
    stripeCustomerId: store.type.string()
  });

  return User;
};
