import * as fs from 'fs';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';
import {LightningClientImpl} from '../proto/lnd/lnrpc/lightning';
import {Observable} from 'rxjs';

const loaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const packageDefinition = protoLoader.loadSync(
  __dirname + '/../proto/lnd/lnrpc/lightning.proto',
  loaderOptions
);

const lndCert = fs.readFileSync(__dirname + '/../config/tls.cert');
const sslCreds = grpc.credentials.createSsl(lndCert);

const macaroon = fs.readFileSync(
  __dirname + '/../config/admin.macaroon'
).toString('hex');
// This value is used for generating and verifying short-lived
// unsigned LN messages used for login authentication, so using
// any value that's unlikely to change often is fine. If this
// value is ever changed, users who happen to be in the middle
// of logging in through LN message signing will simply need to
// try again.
// TODO - Find a better place for this. It makes no sense to have
// here, but it's a convenient place for now.
export const lnAuthJwtSecret = macaroon;
const metadata = new grpc.Metadata();
metadata.add('macaroon', macaroon);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
  (_args, callback) => callback(null, metadata)
);

const credentials =
  grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
const lnrpc = lnrpcDescriptor.lnrpc as grpc.GrpcObject;
const Lightning = lnrpc.Lightning as typeof grpc.Client;
// TODO - Use an environment variable for the LN node URL.
const lightningClient = new Lightning(
  'lightningvend.m.voltageapp.io:10009', credentials);

export const lightning = new LightningClientImpl({
  request: (service, method, data) => {
    return new Promise((resolve, reject) => {
      lightningClient.makeUnaryRequest(
        `/${service}/${method}`,
        x => Buffer.from(x),
        x => x,
        data,
        null,
        null,
        (err, res) => {
          if (err) {
            return reject(err);
          } else if (res) {
            return resolve(res);
          } else {
            return reject('No data returned from GRPC!');
          }
        }
      );
    });
  },
  clientStreamingRequest: (service, method, data) => {
    throw 'Client streaming is unimplemented!';
  },
  serverStreamingRequest: (service, method, data) => {
    return new Observable((subscriber) => {
      const stream = lightningClient.makeServerStreamRequest(
        `/${service}/${method}`,
        x => Buffer.from(x),
        x => x,
        data
      );

      (async () => {
        try {
          for await (const value of stream) {
            subscriber.next(value);
          }
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  },
  bidirectionalStreamingRequest: (service, method, data) => {
    throw 'Bidirectional streaming is unimplemented!';
  }
});
