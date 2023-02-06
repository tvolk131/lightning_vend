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
const metadata = new grpc.Metadata();
metadata.add('macaroon', macaroon);
const macaroonCreds = grpc.credentials.createFromMetadataGenerator((_args, callback) => {
  callback(null, metadata);
});

const credentials = grpc.credentials.combineChannelCredentials(sslCreds, macaroonCreds);
const lnrpcDescriptor = grpc.loadPackageDefinition(packageDefinition);
const lnrpc = lnrpcDescriptor.lnrpc;
export const lightning =
  new (lnrpc as any).Lightning('lightningvend.m.voltageapp.io:10009', credentials);