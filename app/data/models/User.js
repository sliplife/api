module.exports = (store, server) => {

  const User = store.createModel('users', {
    createdAt: store.type.date().default(store.r.now()),
    email: store.type.string(),
    id: store.type.string(),
    password: store.type.string(),
    scope: store.type.array(),
    stripeCustomerId: store.type.string()
  });

  return User;
};
