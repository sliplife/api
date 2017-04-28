module.exports = (store, server) => {

  const Token = store.createModel('tokens', {
    createdAt: store.type.date().default(store.r.now()),
    id: store.type.string(),
    token: store.type.string()
  });

  return Token;
};
