import * as jwt from 'jsonwebtoken';
import {
  createMessageTokenWithExpiration,
  messageIsAuthentic
} from './lnAuthNodeOnly';
import {
  getMessageExpiration,
  messageIsExpired,
  messageIsMalformed
} from './lnAuthBrowserSafe';

const testSecret = 'super_secret_123';

const malformedMessage = jwt.sign({foo: 'bar'}, testSecret);

beforeAll(() => {
  jest.useFakeTimers({now: new Date(1683000000000)});
});

afterAll(() => {
  jest.useRealTimers();
});

it('authenticates messages', () => {
  const message = createMessageTokenWithExpiration(60, testSecret);
  expect(messageIsAuthentic(message, testSecret)).toEqual(true);
  expect(messageIsAuthentic(message + ' ', testSecret)).toEqual(false);
  expect(messageIsAuthentic(message, testSecret + ' ')).toEqual(false);
});

it('gets message expiration times', () => {
  const message = createMessageTokenWithExpiration(60, testSecret);
  expect(getMessageExpiration(message)).toEqual(new Date(1683000060000));
  expect(getMessageExpiration(malformedMessage)).toBeUndefined();
});

it('handles malformed messages', () => {
  const message = createMessageTokenWithExpiration(60, testSecret);
  expect(messageIsMalformed(message)).toEqual(false);
  expect(messageIsMalformed(malformedMessage)).toEqual(true);
});

it('detects expired messages', () => {
  const expiredMessage = createMessageTokenWithExpiration(0, testSecret);
  const unexpiredMessage = createMessageTokenWithExpiration(60, testSecret);
  expect(messageIsExpired(expiredMessage)).toEqual(true);
  expect(messageIsExpired(unexpiredMessage)).toEqual(false);
});
