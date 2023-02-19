import {getParentOfProtoName, getPriceDisplayString} from './protoHelper';
import {Price} from '../../proto_ts_gen/lightning_vend/model_pb';

it('getParentOfProtoName', () => {
  // Top-level resource turns to an empty string.
  expect(getParentOfProtoName('foo/1234')).toEqual('');

  // Direct child of top-level resource gets converted to top-level resource.
  expect(getParentOfProtoName('foo/1234/bar/5678')).toEqual('foo/1234');

  // Nested child gets converted to its direct parent.
  expect(getParentOfProtoName('foo/1234/bar/5678/foobar/9012')).toEqual('foo/1234/bar/5678');

  // Invalid resource names return an empty string.
  expect(getParentOfProtoName('')).toEqual('');
  expect(getParentOfProtoName('/')).toEqual('');
  expect(getParentOfProtoName('foo/')).toEqual('');
  expect(getParentOfProtoName('foo//')).toEqual('');
  expect(getParentOfProtoName('/foo')).toEqual('');

  // Resource names with even number of `/`s are invalid and returns an empty string.
  expect(getParentOfProtoName('foo')).toEqual('');
  expect(getParentOfProtoName('foo/1234/bar')).toEqual('');
  expect(getParentOfProtoName('foo/1234/bar/5678/foobar')).toEqual('');
});

it('getPriceDisplayString', () => {
  // Handle undefined price.
  expect(getPriceDisplayString()).toEqual('Unknown price');

  // Handle empty price.
  const price = new Price();
  expect(getPriceDisplayString(price)).toEqual('Unknown price');

  // Handle BTC values.
  price.setBtcSats(0);
  expect(getPriceDisplayString(price)).toEqual('0 sats');
  price.setBtcSats(1234);
  expect(getPriceDisplayString(price)).toEqual('1234 sats');
  price.setBtcSats(-1234);
  expect(getPriceDisplayString(price)).toEqual('-1234 sats');

  // Handle USD values.
  price.setUsdCents(0);
  expect(getPriceDisplayString(price)).toEqual('$0.00');
  price.setUsdCents(1234);
  expect(getPriceDisplayString(price)).toEqual('$12.34');
  price.setUsdCents(-1234);
  expect(getPriceDisplayString(price)).toEqual('-$12.34');

  // USD cents are padded.
  price.setUsdCents(1204);
  expect(getPriceDisplayString(price)).toEqual('$12.04');
  price.setUsdCents(1230);
  expect(getPriceDisplayString(price)).toEqual('$12.30');
});