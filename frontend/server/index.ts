import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as glob from 'glob';
import * as http from 'http';
import * as path from 'path';
import {Coordinator} from './coordinator';
import {MongoClient} from 'mongodb';
import {User_AuthId} from '../proto_out/lightning_vend/model';
import compression from 'compression';
import express from 'express';
import {lightning} from './lndApi';
import {verifyMessage} from './lnAuth';

export const userSessionCookieName = 'user-session';
export const deviceSessionCookieName = 'device-session';

dotenv.config();

const start = async () => {
  console.log('Starting server...');

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable not set.');
  }

  console.log('Connecting to MongoDB...');
  const client = await new MongoClient(mongoUri).connect();

  const app = express();
  app.use(compression({threshold: 0}));
  app.use(express.json());
  const server = http.createServer(app);
  console.log('Starting Coordinator...');
  const coordinator = await Coordinator.create(
    server,
    lightning,
    client.db('lightningvend')
  );

  app.get('/api/registerAdmin/:message/:signature', async (req, res) => {
    let lightningNodePubkey;
    try {
      lightningNodePubkey = await verifyMessage(
        req.params.message,
        req.params.signature
      );
    } catch (err) {
      return res.status(400).send(err);
    }

    let userSessionToken;
    try {
      userSessionToken = await coordinator.createUserSessionToken(
        User_AuthId.create({
          lightningNodePubkey
        })
      );
    } catch (err) {
      return res.status(500).send(err);
    }

    return res.cookie(
      userSessionCookieName,
      userSessionToken,
      {path: '/'}
    ).send();
  });

  // Serve all files generated by webpack.
  console.log('Reading static files...');
  const rootDir = `${__dirname}/../client/out`;
  const staticFiles = glob.sync(`${rootDir}/**/*`, {nodir: true});
  staticFiles.forEach((filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    const fileContents = fs.readFileSync(filePath);
    let fileExtension = filePath.split('.').pop() || '';

    app.get(`/${relativePath}`, (req, res) => {
      res.type(fileExtension).send(fileContents);
    });
  });
  console.log('Serving static files: [');
  for (const fileName of staticFiles) {
    console.log(`  ${path.relative(rootDir, fileName)}`);
  }
  console.log(']');

  // Fall back to index.html for all other requests. This is necessary for
  // SPA-style apps like ours because the index.html file contains the
  // <script> tag that loads the bundle.js file, which is necessary for
  // client-side routing to work. Note that this must come after the other
  // routes because express will match the first route it finds.
  const indexHtml = fs.readFileSync(`${__dirname}/../client/out/index.html`);
  app.get('*/', (req, res) => {
    res.type('html').send(indexHtml);
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
};

start();
