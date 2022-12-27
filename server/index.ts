import * as express from 'express';
import * as http from 'http';
import * as fs from 'fs';

const app = express();
const server = http.createServer(app);

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Sat Dash</title>
      <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css?family=Material+Icons&display=block" rel="stylesheet">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body id="app" style="margin:auto">
    </body>
    <script type="text/javascript" src="bundle.js"></script>
    </html>
  `);
});

app.get('/bundle.js', (req, res) => {
  res.send(bundle);
});

server.listen(3000, () => {
  console.log('Listening on *:3000');
});
