import {createPageToken, getBoundedPageSize, parsePageToken} from './aipHelper';
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

describe('getBoundedPageSize', () => {
  it('should return the same page size if it is within the boundaries', () => {
    const result = getBoundedPageSize(20, 10, 30);
    expect(result).toBe(20);
  });

  it('should return the max page size if page size exceeds the maximum', () => {
    const result = getBoundedPageSize(40, 10, 30);
    expect(result).toBe(30);
  });

  it('should return the default page size if page size is zero', () => {
    const result = getBoundedPageSize(0, 10, 30);
    expect(result).toBe(10);
  });

  it('should throw an error if page size is negative', () => {
    expect(() => getBoundedPageSize(-5, 10, 30))
      .toThrowError('Page size must be a positive integer.');
  });

  it('should throw an error if default page size is less than 1', () => {
    expect(() => getBoundedPageSize(20, 0, 30))
      .toThrowError('Default page size must be a positive integer.');
  });

  it(
    'should throw an error if max page size is less than default page size',
    () => {
      expect(() => getBoundedPageSize(20, 30, 10))
        .toThrowError(
          'Max page size must be greater than or equal to default page size.'
        );
    }
  );
});
