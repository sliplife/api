module.exports = (store, server) => {

  const Token = store.createModel('tokens', {
    id: store.type.string(),
    token: store.type.string()
  });

  return Token;
};
