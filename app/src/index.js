const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const version = process.env.APP_VERSION || 'local';

app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Kubernetes demo app!',
    version,
    timestamp: new Date().toISOString(),
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`App listening on port ${port} (version=${version})`);
});

