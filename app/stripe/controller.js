const Boom = require('boom');
const Config = require('config');
const Stripe = require('stripe')(Config.stripe.key);

module.exports = ({
  hooks: (request, reply) => {

  },
  createCharge: (request, reply) => {

    const listingId = request.payload.listingId;
    const stripeTokenId = request.payload.stripeTokenId;
    const getAccountStripeCustomerId = () => {

      const { id } = request.auth.credentials.user;
      const User = request.server.plugins.data.store().User;
      return User.get(id).run()
        .then((user) => {

          const { stripeCustomerId } = user;
          return stripeCustomerId;
        });
    };
    const findOrCreateStripeCustomerRecord = (stripeCustomerId) => {

      const { email } = request.auth.credentials.user;
      return (stripeCustomerId)
        ? Stripe.customers.retrieve(stripeCustomerId)
        : Stripe.customers.create({ email, source: stripeTokenId });
    };
    const storeStripeCustomerId = (stripeCustomerId) => {

      const { id } = request.auth.credentials.user;
      const User = request.server.plugins.data.store().User;
      return User.get(id).update({ stripeCustomerId }).run();
    };
    const storeStripeCustomerSourceToken = (stripeCustomerId) => {

      return Stripe.customers.update(stripeCustomerId, { source: stripeTokenId });
    };
    const activateListing = (charge) => {

      const Listing = request.server.plugins.data.store().Listing;
      return Listing.get(listingId).update({ active: true, stripeChargeId: charge.id }).run();
    };

    return getAccountStripeCustomerId()
      .then((stripeCustomerId) => findOrCreateStripeCustomerRecord(stripeCustomerId))
      .then((customer) => storeStripeCustomerId(customer.id))
      .then((customer) => storeStripeCustomerSourceToken(customer.stripeCustomerId))
      .then((customer) => {

        return Stripe.charges.create({
          amount: 1000,
          currency: 'usd',
          customer: customer.id,
          description: `30 day charge for listing id: ${listingId}`
        });
      })
      .then((charge) => activateListing(charge).then(() => reply({ charge })))
      .catch((error) => reply(Boom.badRequest(error)));
  }
});
