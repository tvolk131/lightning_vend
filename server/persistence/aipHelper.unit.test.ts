import {createPageToken, parsePageToken} from './aipHelper';
import {Any} from '../../proto_out/google/protobuf/any';
import {ObjectId} from 'bson';

describe('Page Tokens', () => {
  it('should create and parse a page token', () => {
    const signature = 'signature';
    const lastObjectId = new ObjectId();

    const pageToken = createPageToken(lastObjectId, signature);
    const parsedObjectId = parsePageToken(pageToken, signature);

    expect(parsedObjectId).toEqual(lastObjectId);
  });

  it('should create and parse a page token with empty signature', () => {
    const signature = '';
    const lastObjectId = new ObjectId();

    const pageToken = createPageToken(lastObjectId, signature);
    const parsedObjectId = parsePageToken(pageToken, signature);

    expect(parsedObjectId).toEqual(lastObjectId);
  });

  it('should throw an error if the signature is invalid', () => {
    const signature = 'signature';
    const lastObjectId = new ObjectId();

    const pageToken = createPageToken(lastObjectId, signature);

    expect(() => {
      parsePageToken(pageToken, 'invalid');
    }).toThrow('Invalid page token. Did you change a request parameter other ' +
               'than `pageToken` while paging?');
  });

  it('should throw an error if the page token is invalid', () => {
    expect(() => {
      parsePageToken('invalid', 'signature');
    }).toThrow('Unexpected end of input.');
  });

  it('should throw an error if the page token is empty', () => {
    expect(() => {
      parsePageToken('', 'signature');
    }).toThrow('Unexpected end of input.');
  });

  it(
    'should throw an error if the page token underlying ObjectId is invalid',
    () => {
      expect(() => {
        const any = Any.create({
          typeUrl: 'signature',
          value: new Uint8Array()
        });
        const pageToken = Buffer.from(Any.encode(any).finish()).toString('hex')
          .toUpperCase();
        parsePageToken(pageToken, 'signature');
      }).toThrow('Invalid page token (underlying ObjectId is invalid).');
    });
});
