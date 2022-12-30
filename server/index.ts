import * as express from 'express';
import * as http from 'http';
import * as fs from 'fs';
import {Server} from 'socket.io';
import axios from 'axios';
import {lightning} from './lnd_api';
import {makeUuid} from '../shared/uuid';
import {DeviceSocketManager} from './deviceSocketManager';
import {parse} from 'cookie';
import {DeviceSessionManager} from './deviceSessionManager';
import {socketIoDevicePath} from '../shared/constants';

const app = express();
const server = http.createServer(app);
const deviceSocketServer = new Server(server, {path: socketIoDevicePath});

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);
const macaroon = fs.readFileSync(`${__dirname}/admin.macaroon`).toString('hex');

export const deviceSessionCookieName = 'device-session';

const deviceSocketManager = new DeviceSocketManager(deviceSocketServer);
const deviceSessionManager = new DeviceSessionManager();
const invoicesToDeviceSessionIds: {[invoice: string]: string} = {};

const authenticateDevice = (req: express.Request, res: express.Response) => {
  if (!req.headers.cookie) {
    return {response: res.status(401).send('Device must be registered! No cookie header found.')};
  }

  const deviceSessionId = parse(req.headers.cookie)[deviceSessionCookieName];
  if (!deviceSessionId) {
    return {response: res.status(401).send('Device must be registered! No device session found.')};
  }

  const deviceData = deviceSessionManager.getDeviceData(deviceSessionId);
  if (!deviceData) {
    return {response: res.status(401).send('Device must be registered! Unrecognized device session.')};
  }

  return {deviceData};
};

app.get('*/bundle.js', (req, res) => {
  res.send(bundle);
});

app.get('/api/getInvoice', async (req, res) => {
  const {response, deviceData} = authenticateDevice(req, res);
  if (response) {
    return response;
  }

  // TODO - Use GRPC client rather than an http request.
  // TODO - Require an invoice amount be passed from the UI.
  const resp = await axios.post(
    'https://lightningvend.m.voltageapp.io:8080/v1/invoices',
    {value: 5},
    {headers: {'Grpc-Metadata-macaroon': macaroon}}
  );

  const invoice = resp.data.payment_request;
  invoicesToDeviceSessionIds[invoice] = deviceData.deviceSessionId;
  res.send(invoice);
});

app.get('/api/deviceData', (req, res) => {
  const {response, deviceData} = authenticateDevice(req, res);
  if (response) {
    return response;
  }

  res.send(deviceData);
});

app.get('/api/registerDevice/:lightningNodeOwnerPubkey', async (req, res) => {
  let deviceSessionId;

  if (req.headers.cookie) {
    // Remember, this line could still leave deviceSessionId unset.
    deviceSessionId = parse(req.headers.cookie)[deviceSessionCookieName];
  }
  
  if (!deviceSessionId) {
    deviceSessionId = makeUuid();
  }

  const {deviceData, isNew} = deviceSessionManager.getOrCreateDeviceSession(deviceSessionId, req.params.lightningNodeOwnerPubkey);

  if (isNew) {
    res.cookie(deviceSessionCookieName, deviceSessionId, {path: '/'}).send(deviceData);
  } else {
    res.status(400).send('Device is already registered!');
  }
});

app.get('*/', (req, res) => {
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
      const deviceSessionId = invoicesToDeviceSessionIds[invoice.payment_request];
      if (deviceSessionId) {
        // TODO - Check if this message was send (i.e. if the device is online) and
        // save the event to retry later if the device is currently offline.
        deviceSocketManager.emitInvoicePaid(deviceSessionId, invoice.payment_request);
      }
    }
  })
  .on('end', () => console.log('SubscribeInvoices ended!'))
  .on('status', (status: any) => console.log('SubscribeInvoices status: ', status));
