import * as express from 'express';
import * as http from 'http';
import * as fs from 'fs';
import {Server, Socket} from 'socket.io';
import axios from 'axios';
import {lightning} from './lnd_api';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);
const macaroon = fs.readFileSync(`${__dirname}/admin.macaroon`).toString('hex');

const activeSocketsBySocketId: {[key: string]: Socket} = {};

io.on('connection', (socket) => {
  activeSocketsBySocketId[socket.id] = socket;

  socket.on('disconnect', () => {
    delete activeSocketsBySocketId[socket.id];
  });
});

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

app.get('/api/getInvoice', async (req, res) => {
  // TODO - Use GRPC client rather than an http request.
  const resp = await axios.post(
    'https://lightningvend.m.voltageapp.io:8080/v1/invoices',
    {value: 5},
    {headers: {'Grpc-Metadata-macaroon': macaroon}}
  );
  res.send(resp.data.payment_request);
});

server.listen(3000, () => {
  console.log('Listening on *:3000');
});

interface Invoice {
  payment_request: string,
  state: 'OPEN' | 'SETTLED' | 'CANCELED' | 'ACCEPTED',
  value: string
}

lightning.subscribeInvoices({})
  .on('data', (invoice: Invoice) => {
    if (invoice.state === 'SETTLED') {
      for (const socketId in activeSocketsBySocketId) {
        const socket = activeSocketsBySocketId[socketId];
        socket.emit('invoicePaid', invoice.payment_request);
      }
    }
  })
  .on('end', () => console.log('SubscribeInvoices ended!'))
  .on('status', (status: any) => console.log('SubscribeInvoices status: ', status));
