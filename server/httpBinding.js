function listenOnHost(app, port, host, onListening) {
  return app.listen(port, host, onListening);
}

module.exports = { listenOnHost };
