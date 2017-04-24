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

    const domain = (process.env.NODE_ENV === 'production') ? 'api.sliplife.com' : 'api.sliplife.dev';
    return `//${domain}${upload.path}/${upload.fingerprint}/raw`;
  });

  return Upload;
};
