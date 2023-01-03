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
import {socketIoAdminPath, socketIoDevicePath} from '../shared/constants';
import {AdminSocketManager} from './adminSocketManager';
import {AdminData, AdminSessionManager} from './adminSessionManager';

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);
const macaroon = fs.readFileSync(`${__dirname}/admin.macaroon`).toString('hex');

const app = express();
app.use(express.json());
const server = http.createServer(app);

export const adminSessionCookieName = 'admin-session';
export const deviceSessionCookieName = 'device-session';

const adminSessionManager = new AdminSessionManager();
const deviceSessionManager = new DeviceSessionManager();

const getAdminData = (lightningNodePubkey: string): AdminData | undefined => {
  return {
    lightningNodePubkey,
    devices: deviceSessionManager.getDeviceSessionsBelongingToNodePubkey(lightningNodePubkey).map((deviceData) => {
      return {
        isOnline: deviceSocketManager.isDeviceConnected(deviceData.deviceSessionId),
        deviceData
      };
    })
  };
};

const adminSocketManager = new AdminSocketManager(new Server(server, {path: socketIoAdminPath}), (adminSessionId) => adminSessionManager.getNodePubkeyFromSessionId(adminSessionId), getAdminData);
const deviceSocketManager = new DeviceSocketManager(new Server(server, {path: socketIoDevicePath}), (deviceSessionId) => deviceSessionManager.getDeviceData(deviceSessionId));

deviceSocketManager.subscribeToDeviceConnectionStatus((event) => {
  const ownerPubkey = deviceSessionManager.getDeviceOwnerPubkey(event.deviceSessionId);
  if (ownerPubkey) {
    adminSocketManager.updateAdminData(ownerPubkey);
  }
});

const invoicesToDeviceSessionIds: {[invoice: string]: string} = {};

const authenticateAdmin = (req: express.Request, res: express.Response) => {
  if (!req.headers.cookie) {
    return {response: res.status(401).send('Admin must be registered! No cookie header found.')};
  }

  const adminSessionId = parse(req.headers.cookie)[adminSessionCookieName];
  if (!adminSessionId) {
    return {response: res.status(401).send('Admin must be registered! No admin session found.')};
  }

  const lightningNodePubkey = adminSessionManager.getNodePubkeyFromSessionId(adminSessionId);
  if (!lightningNodePubkey) {
    return {response: res.status(401).send('Admin must be registered! Unrecognized admin session.')};
  }

  return {lightningNodePubkey};
};

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

app.post('/api/registerDevice', (req, res) => {
  if (typeof req.body !== 'object') {
    return {response: res.status(400).send('Request body must be an object.')};
  }
  if (typeof req.body.lightningNodeOwnerPubkey !== 'string') {
    return {response: res.status(400).send('Request body must have string property `lightningNodeOwnerPubkey`.')};
  }
  if (typeof req.body.displayName !== 'string') {
    return {response: res.status(400).send('Request body must have string property `displayName`.')};
  }
  const {lightningNodeOwnerPubkey, displayName}: {lightningNodeOwnerPubkey: string, displayName: string} = req.body;

  let deviceSessionId;

  if (req.headers.cookie) {
    // Remember, this line could still leave deviceSessionId unset.
    deviceSessionId = parse(req.headers.cookie)[deviceSessionCookieName];
  }
  
  if (!deviceSessionId) {
    deviceSessionId = makeUuid();
  }

  const {isNew} = deviceSessionManager.getOrCreateDeviceSession(deviceSessionId, lightningNodeOwnerPubkey, displayName);

  // Note: No manual event trigger is needed here, since the client will automatically
  // disconnect and reconnect its socket, which triggers its own events.

  if (isNew) {
    res.cookie(deviceSessionCookieName, deviceSessionId, {path: '/'}).send();
  } else {
    res.status(400).send('Device is already registered!');
  }
});

// TODO - CRITICAL - This is currently a completely unauthorized login method
// where you simply declare that you're the owner of a particular node to login
// as that node. We need to add some method of actually verifying this. Maybe
// do something similar to https://lightningnetwork.plus/.
app.get('/api/registerAdmin/:lightningNodePubkey', (req, res) => {
  let adminSessionId;

  if (req.headers.cookie) {
    // Remember, this line could still leave adminSessionId unset.
    adminSessionId = parse(req.headers.cookie)[adminSessionCookieName];
  }
  
  if (!adminSessionId) {
    adminSessionId = makeUuid();
  }

  const {isNew} = adminSessionManager.getOrCreateAdminSession(adminSessionId, req.params.lightningNodePubkey);

  if (isNew) {
    res.cookie(adminSessionCookieName, adminSessionId, {path: '/'}).send();
  } else {
    res.status(400).send('Device is already registered!');
  }
});

app.post('/api/updateDeviceDisplayName', async (req, res) => {
  const {response, lightningNodePubkey} = authenticateAdmin(req, res);
  if (response) {
    return response;
  }

  if (typeof req.body !== 'object') {
    return {response: res.status(400).send('Request body must be an object.')};
  }
  if (typeof req.body.displayName !== 'string') {
    return {response: res.status(400).send('Request body must have string property `displayName`.')};
  }
  if (typeof req.body.deviceSessionId !== 'string') {
    return {response: res.status(400).send('Request body must have string property `deviceSessionId`.')};
  }
  const {displayName, deviceSessionId}: {displayName: string, deviceSessionId: string} = req.body;

  if (deviceSessionManager.getDeviceOwnerPubkey(deviceSessionId) !== lightningNodePubkey) {
    return {response: res.status(401).send('Cannot update a device you do not own!')};
  }

  await deviceSessionManager.updateDeviceData(deviceSessionId, (deviceData) => {
    deviceData.displayName = displayName;
    return deviceData;
  }).then((deviceData) => {
    deviceSocketManager.updateDeviceData(deviceSessionId, deviceData);
    adminSocketManager.updateAdminData(lightningNodePubkey);
  });
});

app.get('*/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Lightning Vend</title>
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
