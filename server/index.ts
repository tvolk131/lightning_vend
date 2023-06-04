import * as compression from 'compression';
import * as express from 'express';
import * as fs from 'fs';
import * as http from 'http';
import {Coordinator} from './coordinator';
import {lightning} from './lndApi';
import {makeUuid} from '../shared/uuid';
import {parse} from 'cookie';
import {verifyMessage} from './lnAuth';

const bundle = fs.readFileSync(`${__dirname}/../client/out/bundle.js`);

const app = express();
app.use(compression({threshold: 0}));
app.use(express.json());
const server = http.createServer(app);
const coordinator = new Coordinator(server, lightning);

export const adminSessionCookieName = 'admin-session';
export const deviceSessionCookieName = 'device-session';

const getCookieFromRequest =
(req: express.Request, cookieName: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }
  const cookies = parse(cookieHeader);
  return cookies[cookieName];
};

const getAdminSessionIdFromRequest =
(req: express.Request): string | undefined => {
  return getCookieFromRequest(req, adminSessionCookieName);
};

app.get('*/bundle.js', (req, res) => {
  res.type('.js').send(bundle);
});

app.get('/api/registerAdmin/:message/:signature', async (req, res) => {
  let adminSessionId = getAdminSessionIdFromRequest(req);

  if (!adminSessionId) {
    adminSessionId = makeUuid();
  }

  let lnNodePubkey;
  try {
    lnNodePubkey = await verifyMessage(
      req.params.message,
      req.params.signature
    );
  } catch (err) {
    return res.status(400).send(err);
  }

  const {isNew} = coordinator.getOrCreateAdminSession(
    adminSessionId,
    lnNodePubkey
  );

  if (isNew) {
    return res.cookie(
      adminSessionCookieName,
      adminSessionId,
      {path: '/'}
    ).send();
  } else {
    return res.status(400).send('Device is already registered!');
  }
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
