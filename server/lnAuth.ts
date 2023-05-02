import {VerifyMessageRequest, VerifyMessageResponse} from '../proto/lnd/lnrpc/lightning';
import {
  createMessageTokenWithExpiration,
  messageIsAuthentic
} from '../shared/lnAuthNodeOnly';
import {lightning, lnAuthJwtSecret} from './lnd_api';
import {messageIsExpired, messageIsMalformed} from '../shared/lnAuthBrowserSafe';

export const createSignableMessageWithTTL = (expireTimeSeconds: number) => {
  return createMessageTokenWithExpiration(expireTimeSeconds, lnAuthJwtSecret);
};

export const verifyMessage =
(message: string, signature: string): Promise<string> => {
  if (messageIsMalformed(message)) {
    return Promise.reject('Message is malformed.');
  }

  if (!messageIsAuthentic(message, lnAuthJwtSecret)) {
    return Promise.reject('Message is not authentic.');
  }

  if (messageIsExpired(message)) {
    return Promise.reject('Message has expired.');
  }

  return new Promise((resolve, reject) => {
    return lightning.verifyMessage(
      VerifyMessageRequest.create({
        msg: new TextEncoder().encode(message),
        signature
      }),
      (err: any, rawVerifyMessageResponse: any) => {
        if (err) {
          return reject(err);
        }

        const verifyMessageResponse = VerifyMessageResponse.fromJSON(rawVerifyMessageResponse);
        if (!verifyMessageResponse.valid) {
          return reject('Message signature is not valid.');
        }

        return resolve(verifyMessageResponse.pubkey);
      }
    );
  });
};