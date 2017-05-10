module.exports = (store, server) => {

  const MailingList = store.createModel('mailing_lists', {
    createdAt: store.type.date().default(store.r.now()),
    email: store.type.string(),
    filter: store.type.object(),
    frequency: store.type.string(),
    name: store.type.string()
  });

  return MailingList;
};
