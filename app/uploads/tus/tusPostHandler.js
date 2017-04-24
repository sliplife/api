const BaseHandler = require('tus-node-server/lib/handlers/BaseHandler');
const DataStore = require('tus-node-server/lib/stores/DataStore');
const ERRORS = require('tus-node-server/lib/constants').ERRORS;
const Base64 = require('base-64');

class PostHandler extends BaseHandler {
  constructor(store, dataStore) {

    super(store);
    if (!(store instanceof DataStore)) {
      throw new Error(`${store} is not a DataStore`);
    }
    this.store = store;
    this.dataStore = dataStore;
  }
  /**
   * Create a file in the DataStore.
   *
   * @param  {object} req http.incomingMessage
   * @param  {object} res http.ServerResponse
   * @return {function}
   */
  send(req, res) {

    return this.store.create(req)
        .then((File) => {

          const filename = new RegExp('filename (.*) ?').exec(File.upload_metadata);
          const name = (filename && filename[1]) ? Base64.decode(filename[1]) : undefined;
          const upload_length = req.headers['upload-length'];
          const url = `https://${req.headers.host}${this.store.path}/${File.id}`;
          const Upload = this.dataStore.Upload;
          const upload = new Upload({
            fingerprint: File.id,
            path: this.store.path,
            status: 'pending',
            bytes: parseInt(upload_length, 10),
            name,
            created_at: new Date()
          });
          upload
            .save()
            .then((upload) => BaseHandler.prototype.send.call(this, res, 201, { Location: url }))
            .catch((error) => console.warn('[PostHandler]', error));
        })
        .catch((error) => {

          console.warn('[PostHandler]', error);
          const status_code = error.status_code || ERRORS.UNKNOWN_ERROR.status_code;
          const body = error.body || `${ERRORS.UNKNOWN_ERROR.body}${error.message || ''}\n`;
          return super.send(res, status_code, {}, body);
        });
  }
}

module.exports = PostHandler;
