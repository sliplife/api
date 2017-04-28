const File = require('tus-node-server/lib/models/File');
const Configstore = require('configstore');
const Pkg = require('tus-node-server/package.json');
const MASK = '0777';
const IGNORED_MKDIR_ERROR = 'EEXIST';
const FILE_DOESNT_EXIST = 'ENOENT';
const ERRORS = require('tus-node-server/lib/constants').ERRORS;
const Fs = require('fs-promise');
const ReadChunk = require('read-chunk');
const FileType = require('file-type');
const Sharp = require('sharp');
const FileStore = require('tus-node-server/lib/stores/FileStore');

class tusStore extends FileStore {
  constructor(options) {

    super(options);

    this.directory = options.directory || options.path.replace(/^\//, '');
    this.dataStore = options.dataStore;
    this.extensions = ['creation', 'creation-defer-length'];
    this.configstore = new Configstore(`${Pkg.name}-${Pkg.version}`);
    this._checkOrCreateDirectory();
  }

  /**
   *  Ensure the directory exists.
   */
  _checkOrCreateDirectory() {

    Fs.mkdir(this.directory, MASK, (error) => {

      if (error && error.code !== IGNORED_MKDIR_ERROR) {
        throw error;
      }
    });
  }

  /**
   * Create an empty file.
   *
   * @param  {object} req http.incomingMessage
   * @param  {File} file
   * @return {Promise}
   */
  create(req) {

    return new Promise((resolve, reject) => {

      const upload_length = req.headers['upload-length'];
      const upload_defer_length = req.headers['upload-defer-length'];
      const upload_metadata = req.headers['upload-metadata'];

      if (upload_length === undefined && upload_defer_length === undefined) {
        return reject(ERRORS.INVALID_LENGTH);
      }

      let file_id;
      try {
        file_id = this.generateFileName(req);
      }
      catch (generateError) {
        console.warn('[FileStore] create: check your naming function. Error', generateError);
        return reject(ERRORS.FILE_WRITE_ERROR);
      }

      const file = new File(file_id, upload_length, upload_defer_length, upload_metadata);

      return Fs.open(`${this.directory}/${file.id}`, 'w', (err, fd) => {

        if (err) {
          console.warn('[FileStore] create: Error', err);
          return reject(err);
        }

        this.configstore.set(file.id, file);

        return Fs.close(fd, (exception) => {

          if (exception) {
            console.warn('[FileStore] create: Error', exception);
            return reject(exception);
          }

          return resolve(file);
        });
      });
    });
  }

  /**
   * Write to the file, starting at the provided offset
   *
   * @param  {object} req http.incomingMessage
   * @param  {string} file_id   Name of file
   * @param  {integer} offset     starting offset
   * @return {Promise}
   */
  write(req, file_id, offset) {

    return new Promise((resolve, reject) => {

      const path = `${this.directory}/${file_id}`;
      console.log('WRITE TO THIS PATH:', path);
      const options = {
        flags: 'r+',
        start: offset
      };

      console.log('CREATING WRITE STREAM WITH OPTIONS', options);
      const stream = Fs.createWriteStream(path, options);

      let new_offset = 0;
      req.on('data', (buffer) => {

        new_offset += buffer.length;
      });

      // division coerces string float to number float.
      Number.prototype.toFixedNumber = function (x, base) {

        const pow = Math.pow(base || 10, x);
        return +( Math.round(this * pow) / pow );
      };

      req.on('end', () => {

        console.info(`[FileStore] write: ${new_offset} bytes written to ${path}`);
        offset += new_offset;
        console.info(`[FileStore] write: File is now ${offset} bytes`);
        this.dataStore.Upload
          .filter({ fingerprint: file_id })
          .limit(1)
          .run()
          .then((files) => {

            if (!files.length) {
              return reject('Invalid email or password.');
            }
            const file = files.pop();
            let status = 'pending';
            let extension = undefined;
            let type = undefined;
            const percentage = (offset / file.bytes * 100).toFixedNumber(2);
            if (file.bytes === offset) {
              status = 'complete';
              const buffer = ReadChunk.sync(path, 0, 262);
              const fileInfo = FileType(buffer);
              extension = fileInfo.ext || undefined;
              type = fileInfo.mime || undefined;
              // Store width and height of images.
              const image = Sharp(path);
              image
                .metadata()
                .then((metadata) => {

                  this.dataStore.Upload
                    .get(file.id)
                    .update({
                      status,
                      offset,
                      extension,
                      height: metadata.height,
                      type,
                      percentage,
                      updated_at: new Date(),
                      width: metadata.width
                    })
                    .run()
                    .then((upload) => {

                      const file_path = `${this.directory}/${file_id}`;
                      const final_file_path = `${this.directory}/${upload.getDirectoryPath()}`;
                      return Fs.move(file_path, final_file_path);
                    })
                    .then(() => resolve(offset))
                    .catch((error) => reject(error));
                });
            }
            else {
              this.dataStore.Upload
                .get(file.id)
                .update({
                  status,
                  offset,
                  extension,
                  type,
                  percentage,
                  updated_at: new Date()
                })
                .run()
                .then(() => resolve(offset))
                .catch((error) => reject(error));
            }
          })
          .catch((error) => reject(error));
      });

      stream.on('error', (e) => {

        console.warn('[FileStore] write: Error', e);
        reject(ERRORS.FILE_WRITE_ERROR);
      });

      return req.pipe(stream);
    });
  }

  /**
   * Return file stats, if they exits
   *
   * @param  {string} file_id name of the file
   * @return {object}           fs stats
   */
  getOffset(file_id) {

    const config = this.configstore.get(file_id);
    return new Promise((resolve, reject) => {

      const file_path = `${this.directory}/${file_id}`;
      Fs.stat(file_path, (error, stats) => {

        if (error && error.code === FILE_DOESNT_EXIST && config) {
          console.warn(`[FileStore] getOffset: No file found at ${file_path} but db record exists`, config);
          return reject(ERRORS.FILE_NO_LONGER_EXISTS);
        }

        if (error && error.code === FILE_DOESNT_EXIST) {
          console.warn(`[FileStore] getOffset: No file found at ${file_path}`);
          return reject(ERRORS.FILE_NOT_FOUND);
        }

        if (error) {
          return reject(error);
        }

        if (stats.isDirectory()) {
          console.warn(`[FileStore] getOffset: ${file_path} is a directory`);
          return reject(ERRORS.FILE_NOT_FOUND);
        }

        const data = Object.assign(stats, config);
        return resolve(data);
      });
    });
  }

}

module.exports = tusStore;
