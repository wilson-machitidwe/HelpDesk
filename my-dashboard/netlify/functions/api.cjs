const serverless = require('serverless-http');
const { app, ready } = require('../../server/index');

const handler = serverless(app);
let startupError = null;
const readySafe = Promise.resolve(ready).catch((err) => {
  startupError = err;
  console.error('Startup initialization failed:', err && err.stack ? err.stack : err);
});

module.exports.handler = async (event, context) => {
  await readySafe;
  if (startupError) {
    console.error('Continuing request handling despite startup error.');
  }
  return handler(event, context);
};
