import {
  createMessageTokenWithExpiration,
  messageIsAuthentic
} from '../shared/lnAuthNodeOnly';
import {lightning, lnAuthJwtSecret} from './lnd_api';
import {messageIsExpired, messageIsMalformed} from '../shared/lnAuthBrowserSafe';
import {VerifyMessageRequest} from '../proto/lnd/lnrpc/lightning';

export const createSignableMessageWithTTL = (expireTimeSeconds: number) => {
  return createMessageTokenWithExpiration(expireTimeSeconds, lnAuthJwtSecret);
};

export const verifyMessage =
async (message: string, signature: string): Promise<string> => {
  if (messageIsMalformed(message)) {
    throw 'Message is malformed.';
  }

  if (!messageIsAuthentic(message, lnAuthJwtSecret)) {
    throw 'Message is not authentic.';
  }

  if (messageIsExpired(message)) {
    throw 'Message has expired.';
  }

  const response = await lightning.VerifyMessage(
    VerifyMessageRequest.create({
      msg: new TextEncoder().encode(message),
      signature
    })
  );

  if (!response.valid) {
    throw 'Message signature is not valid.';
  }

  return response.pubkey;
};