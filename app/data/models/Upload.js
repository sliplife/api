const Moment = require('moment');
const Path = require('path');

module.exports = (store, server) => {

  const Upload = store.createModel('uploads', {
    createdAt: store.type.date().default(store.r.now()),
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

  Upload.define('getDirectoryPath', function () {

    return Path.join(...Moment(this.createdAt).format('YYYY/MM/DD').split('/'), this.fingerprint);
  });

  return Upload;
};
