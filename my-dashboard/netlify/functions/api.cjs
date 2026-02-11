const serverless = require('serverless-http');
const { app, ready } = require('../../server/index');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  await ready;
  return handler(event, context);
};
