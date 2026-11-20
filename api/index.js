module.exports = (req, res) => {
  try {
    const app = require('../server/server.js');
    return app(req, res);
  } catch (err) {
    return res.status(500).json({
      error: 'Backend Execution Error',
      message: err.message,
      stack: err.stack
    });
  }
};
