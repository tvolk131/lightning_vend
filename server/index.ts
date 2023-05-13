import * as compression from 'compression';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import {
  AdminClientToServerEvents,
  AdminInterServerEvents,
  AdminServerToClientEvents,
  AdminSocketData
} from '../shared/adminSocketTypes';
import {AdminData, AdminSessionManager} from './adminSessionManager';
import {DeviceSessionManager, tryCastToInventoryArray} from './deviceSessionManager';
import {Invoice, decode as decodeInvoice} from '@node-lightning/invoice';
import {
  InvoiceSubscription,
  Invoice as LNDInvoice,
  Invoice_InvoiceState as LNDInvoice_InvoiceState
} from '../proto/lnd/lnrpc/lightning';
import {createSignableMessageWithTTL, verifyMessage} from './lnAuth';
import {socketIoAdminPath, socketIoDevicePath} from '../shared/constants';
import {AdminSocketManager} from './adminSocketManager';
import {DeviceSocketManager} from './deviceSocketManager';
import {Server} from 'socket.io';
import {lightning} from './lnd_api';
import {makeUuid} from '../shared/uuid';
import {parse} from 'cookie';

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);

const app = express();
app.use(compression({threshold: 0}));
app.use(express.json());
const server = http.createServer(app);

export const adminSessionCookieName = 'admin-session';
export const deviceSessionCookieName = 'device-session';

const adminSessionManager = new AdminSessionManager();
const deviceSessionManager = new DeviceSessionManager();

const getAdminData = (lightningNodePubkey: string): AdminData | undefined => {
  return {
    lightningNodePubkey,
    deviceViews: deviceSessionManager
      .getDevicesBelongingToNodePubkey(lightningNodePubkey)
      .map((device) => {
        return {
          isOnline: deviceSocketManager.isDeviceConnected(device.deviceSessionId),
          device
        };
      })
  };
};

const adminSocketManager = new AdminSocketManager(
  new Server<AdminClientToServerEvents,
             AdminServerToClientEvents,
             AdminInterServerEvents,
             AdminSocketData>(server, {
    path: socketIoAdminPath,
    pingInterval: 5000,
    pingTimeout: 4000
  }),
  (adminSessionId) => adminSessionManager.getNodePubkeyFromSessionId(adminSessionId),
  getAdminData
);
const deviceSocketManager = new DeviceSocketManager(
  new Server<AdminClientToServerEvents,
             AdminServerToClientEvents,
             AdminInterServerEvents,
             AdminSocketData>(server, {
    path: socketIoDevicePath,
    pingInterval: 5000,
    pingTimeout: 4000
  }),
  deviceSessionManager.getDevice.bind(deviceSessionManager)
);

deviceSocketManager.subscribeToDeviceConnectionStatus((event) => {
  const ownerPubkey = deviceSessionManager.getDeviceOwnerPubkey(event.deviceSessionId);
  if (ownerPubkey) {
    adminSocketManager.updateAdminData(ownerPubkey);
  }
});

const isInvoiceExpired = (invoice: Invoice): boolean => {
  const now = new Date();
  const createTime = new Date(invoice.timestamp);

  const elapsedSeconds = now.getUTCSeconds() - createTime.getUTCSeconds();
  const secondsRemainingToExpiry = invoice.expiry - elapsedSeconds;

  return secondsRemainingToExpiry < 0;
};

// TODO - Persist this in a MongoDB collection and use
// a TTL to automatically clean up expired invoices.
const invoicesToDeviceSessionIds: Map<string, string> = new Map();

// Once per minute, flush all expired invoices.
setInterval(() => {
  const invoicesToDelete: string[] = [];
  Array.from(invoicesToDeviceSessionIds.entries()).forEach(([invoice, sessionId]) => {
    if (isInvoiceExpired(decodeInvoice(invoice))) {
      invoicesToDelete.push(invoice);
    }
  });

  invoicesToDelete.forEach(invoice => {
    invoicesToDeviceSessionIds.delete(invoice);
  });
}, 60000);

const authenticateAdmin = (req: express.Request, res: express.Response) => {
  if (!req.headers.cookie) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! No cookie header found.')
    };
  }

  const adminSessionId = parse(req.headers.cookie)[adminSessionCookieName];
  if (!adminSessionId) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! No admin session found.')
    };
  }

  const lightningNodePubkey = adminSessionManager.getNodePubkeyFromSessionId(adminSessionId);
  if (!lightningNodePubkey) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! Unrecognized admin session.')
    };
  }

  return {lightningNodePubkey};
};

const authenticateDevice = (req: express.Request, res: express.Response) => {
  if (!req.headers.cookie) {
    return {
      response: res
        .status(401)
        .send('Device must be registered! No cookie header found.')
    };
  }

  const deviceSessionId = parse(req.headers.cookie)[deviceSessionCookieName];
  if (!deviceSessionId) {
    return {
      response: res
        .status(401)
        .send('Device must be registered! No device session found.')
    };
  }

  const device = deviceSessionManager.getDevice(deviceSessionId);
  if (!device) {
    return {
      response: res
        .status(401)
        .send('Device must be registered! Unrecognized device session.')
    };
  }

  return {device};
};

app.get('*/bundle.js', (req, res) => {
  res.type('.js').send(bundle);
});

app.post('/api/createInvoice', async (req, res) => {
  if (typeof req.body !== 'object') {
    return {
      response: res
        .status(400)
        .send('Request body must be an object.')
    };
  }
  if (typeof req.body.valueSats !== 'number' ||
      req.body.valueSats < 1 ||
      !Number.isInteger(req.body.valueSats)) {
    return {
      response: res
        .status(400)
        .send('Request body must have positive integer property `valueSats`.')
    };
  }

  const {response, device} = authenticateDevice(req, res);
  if (response) {
    return response;
  }

  const preCreatedInvoice = LNDInvoice.create({
    value: req.body.valueSats,
    expiry: '300' // 300 seconds -> 5 minutes.
  });

  const addInvoiceResponse = await lightning.AddInvoice(preCreatedInvoice);
  invoicesToDeviceSessionIds.set(addInvoiceResponse.paymentRequest, device.deviceSessionId);
  res.send(addInvoiceResponse.paymentRequest);
});

app.post('/api/registerDevice', (req, res) => {
  if (typeof req.body !== 'object') {
    return {
      response: res
        .status(400)
        .send('Request body must be an object.')
    };
  }
  if (typeof req.body.lightningNodeOwnerPubkey !== 'string' ||
      req.body.lightningNodeOwnerPubkey.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `lightningNodeOwnerPubkey`.')
    };
  }
  if (typeof req.body.displayName !== 'string' ||
      req.body.displayName.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `displayName`.')
    };
  }
  if (!Array.isArray(req.body.supportedExecutionCommands)) {
    return {
      response: res
        .status(400)
        .send('Request body must have string array property `supportedExecutionCommands`.')
    };
  }
  for (let i = 0; i < req.body.supportedExecutionCommands.length; i++) {
    if (typeof req.body.supportedExecutionCommands[i] !== 'string') {
      return {
        response: res
          .status(400)
          .send('Request body must have string array property `supportedExecutionCommands`.')
      };
    }
  }

  const {
    lightningNodeOwnerPubkey,
    displayName,
    supportedExecutionCommands
  }: {
    lightningNodeOwnerPubkey: string,
    displayName: string,
    supportedExecutionCommands: string[]
  } = req.body;

  let deviceSessionId;

  if (req.headers.cookie) {
    // Remember, this line could still leave deviceSessionId unset.
    deviceSessionId = parse(req.headers.cookie)[deviceSessionCookieName];
  }

  if (!deviceSessionId) {
    deviceSessionId = makeUuid();
  }

  const {isNew} = deviceSessionManager.getOrCreateDeviceSession(
    deviceSessionId,
    lightningNodeOwnerPubkey,
    displayName,
    supportedExecutionCommands
  );

  // Note: No manual event trigger is needed here, since the client will automatically
  // disconnect and reconnect its socket, which triggers its own events.

  if (isNew) {
    const now = new Date();
    const oneThousandYearsFromNow =
      new Date(now.getFullYear() + 1000, now.getMonth(), now.getDate());
    res.cookie(
      deviceSessionCookieName,
      deviceSessionId,
      {path: '/', expires: oneThousandYearsFromNow}
    ).send();
  } else {
    res.status(400).send('Device is already registered!');
  }
});

app.get('/api/getLnAuthMessage', async (req, res) => {
  // Generate an unsigned message that's valid for 5 minutes.
  res.send(createSignableMessageWithTTL(60 * 5));
});

app.get('/api/registerAdmin/:message/:signature', async (req, res) => {
  let adminSessionId;

  if (req.headers.cookie) {
    // Remember, this line could still leave adminSessionId unset.
    adminSessionId = parse(req.headers.cookie)[adminSessionCookieName];
  }

  if (!adminSessionId) {
    adminSessionId = makeUuid();
  }

  let lnNodePubkey;
  try {
    lnNodePubkey = await verifyMessage(req.params.message, req.params.signature);
  } catch (err) {
    return res.status(400).send(err);
  }

  const {isNew} = adminSessionManager.getOrCreateAdminSession(
    adminSessionId,
    lnNodePubkey
  );

  if (isNew) {
    return res.cookie(adminSessionCookieName, adminSessionId, {path: '/'}).send();
  } else {
    return res.status(400).send('Device is already registered!');
  }
});

app.post('/api/updateDeviceDisplayName', async (req, res) => {
  const {response, lightningNodePubkey} = authenticateAdmin(req, res);
  if (response) {
    return response;
  }

  if (typeof req.body !== 'object') {
    return {
      response: res
        .status(400)
        .send('Request body must be an object.')
    };
  }
  if (typeof req.body.displayName !== 'string' || req.body.displayName.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `displayName`.')
    };
  }
  if (typeof req.body.deviceSessionId !== 'string' || req.body.deviceSessionId.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `deviceSessionId`.')
    };
  }
  const {displayName, deviceSessionId}: {displayName: string, deviceSessionId: string} = req.body;

  if (deviceSessionManager.getDeviceOwnerPubkey(deviceSessionId) !== lightningNodePubkey) {
    return {
      response: res
        .status(401)
        .send('Cannot update a device you do not own!')
    };
  }

  await deviceSessionManager.updateDevice(deviceSessionId, (device) => {
    device.displayName = displayName;
    return device;
  }).then((device) => {
    deviceSocketManager.updateDevice(deviceSessionId, device);
    adminSocketManager.updateAdminData(lightningNodePubkey);
    res.status(200).send();
  });
});

app.post('/api/updateDeviceInventory', async (req, res) => {
  const {response, lightningNodePubkey} = authenticateAdmin(req, res);
  if (response) {
    return response;
  }

  if (typeof req.body !== 'object') {
    return {
      response: res
        .status(400)
        .send('Request body must be an object.')
    };
  }
  if (typeof req.body.deviceSessionId !== 'string' || req.body.deviceSessionId.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `deviceSessionId`.')
    };
  }
  const deviceSessionId: string = req.body.deviceSessionId;
  const newInventory = tryCastToInventoryArray(req.body.inventory); // TODO - Add some validation.
  if (!newInventory) {
    return {
      response: res
        .status(400)
        .send('Request body must have valid array of InventoryItems on property `inventory`.')
    };
  }

  if (deviceSessionManager.getDeviceOwnerPubkey(deviceSessionId) !== lightningNodePubkey) {
    return {
      response: res
        .status(401)
        .send('Cannot update a device you do not own!')
    };
  }

  await deviceSessionManager.updateDevice(deviceSessionId, (device) => {
    device.inventory = newInventory;
    return device;
  }).then((device) => {
    deviceSocketManager.updateDevice(deviceSessionId, device);
    adminSocketManager.updateAdminData(lightningNodePubkey);
    res.status(200).send();
  });
});

app.get('*/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Lightning Vend</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:auto">
      <div id="app">
      </div>
    </body>
    <script type="text/javascript" src="bundle.js"></script>
    </html>
  `);
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Listening on *:${port}`); // eslint-disable-line no-console
});

lightning.SubscribeInvoices(InvoiceSubscription.create())
  .subscribe((invoice) => {
    if (invoice.state === LNDInvoice_InvoiceState.SETTLED && invoice.paymentRequest) {
      const deviceSessionId = invoicesToDeviceSessionIds.get(invoice.paymentRequest);
      if (deviceSessionId) {
        // TODO - Check if this message was sent (i.e. if the device is online) and
        // save the event to retry later if the device is currently offline.
        deviceSocketManager.emitInvoicePaid(deviceSessionId, invoice.paymentRequest);
      }
    }
  });
