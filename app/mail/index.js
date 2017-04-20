const NodeMailer = require('nodemailer');

const plugin = (sliplife, options, nextPlugin) => {

  sliplife.dependency(plugin.attributes.dependencies, (server, nextDependency) => {

    const transporter = require(`nodemailer-${server.app.config.mail.transport}-transport`);
    const mailer = NodeMailer.createTransport(transporter(server.app.config.mail[server.app.config.mail.transport]));
    server.expose('mailer', mailer);
    nextDependency();
  });
  nextPlugin();
};

plugin.attributes = {
  name: 'mail',
  dependencies: []
};

exports.register = plugin;
