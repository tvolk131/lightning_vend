import {Any} from '../../proto_out/google/protobuf/any';
import {ObjectId} from 'bson';

/**
 * Create a page token that can be used to paginate through a collection of
 * resources. The page token is a hex-encoded string. Does not throw an error.
 * @param lastObjectId The ObjectId of the last resource in the current page.
 * @param signature An arbitrary string that is used to store data about a
 * pagination request to verify that invariants are maintained between a series
 * of subsequent pagination requests. The data within the signature is embedded
 * in the page token and is used when the page token is decoded to verify that
 * the embedded signature matches the signature of the subsequent pagination
 * request. See the documentation for `page_token` in
 * https://google.aip.dev/132#request-message for details.
 * @returns A page token that can be decoded and verified with `parsePageToken`.
 */
export const createPageToken = (
  lastObjectId: ObjectId,
  signature: string
): string => {
  const any = Any.create({
    typeUrl: signature,
    value: lastObjectId.id
  });
  return Buffer.from(Any.encode(any).finish()).toString('hex').toUpperCase();
};

/**
 * Decode and verify a page token. Throws an error if the page token is invalid
 * or if the signature does not match the signature embedded in the page token.
 * @param pageToken The page token to decode.
 * @param signature Used to verify that invariants between subsequent pagination
 * requests are maintained. The signature is compared to the signature embedded
 * in the page token and an error is thrown if they do not match. See the
 * documentation for `page_token` in https://google.aip.dev/132#request-message
 * for details.
 * @returns The ObjectId of the last resource in the current page that was
 * encoded in the page token when it was created with `createPageToken`.
 */
export const parsePageToken = (
  pageToken: string,
  signature: string
): ObjectId => {
  const any = Any.decode(Buffer.from(pageToken, 'hex'));
  if (any.typeUrl !== signature) {
    if (any.typeUrl === '') {
      throw new Error('Unexpected end of input.');
    }
    throw new Error('Invalid page token. Did you change a request parameter ' +
                    'other than `pageToken` while paging?');
  }
  try {
    return new ObjectId(any.value);
  } catch (err) {
    throw new Error('Invalid page token (underlying ObjectId is invalid).');
  }
};

export const getBoundedPageSize = (
  pageSize: number,
  defaultPageSize: number,
  maxPageSize: number
): number => {
  if (pageSize < 0) {
    throw new Error('Page size must be a positive integer.');
  }
  if (defaultPageSize < 1) {
    throw new Error('Default page size must be a positive integer.');
  }
  if (maxPageSize < defaultPageSize) {
    throw new Error('Max page size must be greater than or equal to ' +
                    'default page size.');
  }
  if (pageSize > maxPageSize) {
    return maxPageSize;
  }
  if (pageSize === 0) {
    return defaultPageSize;
  }
  return pageSize;
};
