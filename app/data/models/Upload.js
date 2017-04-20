module.exports = (store, server) => {

  const Upload = store.createModel('uploads', {
    id: store.type.string(),
    name: store.type.string(),
    description: store.type.string(),
    url: store.type.virtual().default(function () {

      return this.clientUrl(this);
    })
  });

  Upload.define('clientUrl', (upload) => {

    const port = (server.app.config.client.port === 80) ? '' : `:${server.app.config.client.port}`;
    return `//${upload.domain}${port}${upload.path}/${upload.fingerprint}`;
  });

  return Upload;
};
