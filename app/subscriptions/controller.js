const Boom = require('boom');
const Promise = require('bluebird');
const Request = require('request-promise');
const Config = require('config');
const ObjectHash = require('object-hash');

const mailgun = Request.defaults({
  baseUrl: 'https://api.mailgun.net/v3',
  headers: {
    authorization: `Basic ${new Buffer(`api:${Config.mail.mailgun.auth.api_key}`).toString('base64')}`
  },
  json: true
});

module.exports = ({
  index: (request, reply) => {

    mailgun.get('/lists/pages')
      .then((payload) => reply(payload))
      .catch((error) => reply(Boom.badRequest(error)));
  },
  create: (request, reply) => {

    const { filter, description, email, frequency } = request.payload;
    const mailingListHashKey = ObjectHash({ filter, frequency });
    const mailingList = {
      address: `${mailingListHashKey}@mg.sliplife.com`,
      name: description.toLowerCase(),
      description: frequency
    };
    const createMailingList = () => {

      return mailgun.post('/lists', { form: mailingList })
        .then((payload) => {

          const { list } = payload;
          const store = request.server.plugins.data.store();
          const MailingList = store.MailingList;
          const mailingListInstance = new MailingList({
            email: list.address,
            filter,
            frequency,
            name: description.toLowerCase()
          });
          return mailingListInstance.save();
        });
    };
    const subscribeToMailingList = () => {

      const member = {
        address: email,
        upsert: true,
        vars: JSON.stringify({ frequency })
      };
      return mailgun.post(`/lists/${mailingList.address}/members`, { form: member });
    };

    createMailingList()
      .then((payload) => subscribeToMailingList())
      .then((payload) => reply(payload))
      .catch(() => {
        // Catch list already exists errors and attempt subscribe.
        subscribeToMailingList()
            .then((payload) => reply(payload))
            .catch((error) => reply(Boom.badRequest(error)));
      });
  }
});
