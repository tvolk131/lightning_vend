import * as fs from 'fs';
import * as grpc from 'grpc';
import * as protoLoader from '@grpc/proto-loader';

const loaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
};

const packageDefinition =
  protoLoader.loadSync(__dirname + '/../proto/lnd/lnrpc/lightning.proto', loaderOptions);

const lndCert = fs.readFileSync(__dirname + '/../config/tls.cert');
const sslCreds = grpc.credentials.createSsl(lndCert);

const macaroon = fs.readFileSync(__dirname + '/../config/admin.macaroon').toString('hex');
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
const macaroonCreds = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
  callback(null, metadata);
});

const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
const lnrpc = lnrpcDescriptor.lnrpc;
// TODO - Use an environment variable for the LN node URL.
export const lightning =
  new (lnrpc as any).Lightning('lightningvend.m.voltageapp.io:10009', credentials);
