module.exports = (store, server) => {

  const User = store.createModel('users', {
    id: store.type.string(),
    email: store.type.string(),
    password: store.type.string(),
    scope: store.type.array()
  });

  return User;
};
