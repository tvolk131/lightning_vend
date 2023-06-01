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
import {
  DeviceClientToServerEvents,
  DeviceInterServerEvents,
  DeviceServerToClientEvents,
  DeviceSocketData
} from '../shared/deviceSocketTypes';
import {DeviceName, UserName} from '../shared/proto';
import {DeviceSessionManager, tryCastToInventoryArray} from './deviceSessionManager';
import {
  Invoice_InvoiceState as InvoiceState,
  InvoiceSubscription
} from '../proto/lnd/lnrpc/lightning';
import {createSignableMessageWithTTL, verifyMessage} from './lnAuth';
import {socketIoAdminPath, socketIoDevicePath} from '../shared/constants';
import {AdminSocketManager} from './adminSocketManager';
import {DeviceSocketManager} from './deviceSocketManager';
import {InvoiceManager} from './invoiceManager';
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

const getCookieFromRequest = (req: express.Request, cookieName: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const cookies = parse(cookieHeader);
  return cookies[cookieName];
};

const getAdminSessionIdFromRequest = (req: express.Request): string | undefined => {
  return getCookieFromRequest(req, adminSessionCookieName);
};

const adminSessionManager = new AdminSessionManager();
const deviceSessionManager = new DeviceSessionManager();

const invoiceManager = new InvoiceManager(lightning);

const getAdminData = (userName: UserName): AdminData | undefined => {
  return {
    userName,
    deviceViews: deviceSessionManager
      .getDevices(userName)
      .map((device) => {
        const deviceName = DeviceName.parse(device.name);
        return {
          isOnline: deviceName ?
            deviceSocketManager.isDeviceConnected(deviceName)
            :
            false,
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
  adminSessionManager.getUserNameFromSessionId.bind(adminSessionManager),
  getAdminData,
  (deviceSetupCode: string, userName: UserName, deviceDisplayName: string) => {
    const claimDeviceRes =
      deviceSessionManager.claimDevice(deviceSetupCode, userName, deviceDisplayName);
    if (claimDeviceRes) {
      const {device, deviceSessionId} = claimDeviceRes;
      const deviceName = DeviceName.parse(device.name);
      if (deviceName) {
        deviceSocketManager.linkDeviceSessionIdToDeviceName(deviceSessionId, deviceName);
        deviceSocketManager.updateDevice(deviceName, device);
      }
    }
  }
);
const deviceSocketManager = new DeviceSocketManager(
  invoiceManager,
  new Server<DeviceClientToServerEvents,
             DeviceServerToClientEvents,
             DeviceInterServerEvents,
             DeviceSocketData>(server, {
    path: socketIoDevicePath,
    pingInterval: 5000,
    pingTimeout: 4000
  }),
  deviceSessionManager
);

deviceSocketManager.subscribeToDeviceConnectionStatus((event) => {
  adminSocketManager.updateAdminData(event.deviceName.getUserName());
});

const authenticateAdmin = (req: express.Request, res: express.Response) => {
  if (!req.headers.cookie) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! No cookie header found.')
    };
  }

  const adminSessionId = getAdminSessionIdFromRequest(req);
  if (!adminSessionId) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! No admin session found.')
    };
  }

  const userName = adminSessionManager.getUserNameFromSessionId(adminSessionId);
  if (!userName) {
    return {
      response: res
        .status(401)
        .send('Admin must be registered! Unrecognized admin session.')
    };
  }

  return {userName};
};

app.get('*/bundle.js', (req, res) => {
  res.type('.js').send(bundle);
});

app.get('/api/getLnAuthMessage', async (req, res) => {
  // Generate an unsigned message that's valid for 5 minutes.
  res.send(createSignableMessageWithTTL(60 * 5));
});

app.get('/api/registerAdmin/:message/:signature', async (req, res) => {
  let adminSessionId = getAdminSessionIdFromRequest(req);

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
  const {response, userName} = authenticateAdmin(req, res);
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
  if (typeof req.body.deviceName !== 'string' || req.body.deviceName.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `deviceName`.')
    };
  }

  const displayName: string = req.body.displayName;
  const rawDeviceName: string = req.body.deviceName;
  const deviceName = DeviceName.parse(rawDeviceName);

  if (!deviceName || deviceName.getUserName().toString() !== userName.toString()) {
    return {
      response: res
        .status(401)
        .send('Cannot update a device you do not own!')
    };
  }

  await deviceSessionManager.updateDevice(deviceName, (device) => {
    device.displayName = displayName;
    return device;
  }).then((device) => {
    deviceSocketManager.updateDevice(deviceName, device);
    adminSocketManager.updateAdminData(userName);
    res.status(200).send();
  });
});

app.post('/api/updateDeviceInventory', async (req, res) => {
  const {response, userName} = authenticateAdmin(req, res);
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
  if (typeof req.body.deviceName !== 'string' || req.body.deviceName.length === 0) {
    return {
      response: res
        .status(400)
        .send('Request body must have string property `deviceName`.')
    };
  }

  const rawDeviceName: string = req.body.deviceName;
  const deviceName = DeviceName.parse(rawDeviceName);
  const newInventory = tryCastToInventoryArray(req.body.inventory); // TODO - Add some validation.
  if (!newInventory) {
    return {
      response: res
        .status(400)
        .send('Request body must have valid array of InventoryItems on property `inventory`.')
    };
  }

  if (!deviceName || deviceName.getUserName().toString() !== userName.toString()) {
    return {
      response: res
        .status(401)
        .send('Cannot update a device you do not own!')
    };
  }

  await deviceSessionManager.updateDevice(deviceName, (device) => {
    device.inventory = newInventory;
    return device;
  }).then((device) => {
    deviceSocketManager.updateDevice(deviceName, device);
    adminSocketManager.updateAdminData(userName);
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
    if (invoice.state === InvoiceState.SETTLED && invoice.paymentRequest) {
      const deviceName = invoiceManager.getInvoiceCreator(invoice.paymentRequest);
      if (deviceName) {
        // TODO - Check if this message was sent (i.e. if the device is online) and
        // save the event to retry later if the device is currently offline.
        deviceSocketManager.emitInvoicePaid(deviceName, invoice.paymentRequest);
      }
    }
  });
