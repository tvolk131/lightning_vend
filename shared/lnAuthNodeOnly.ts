import * as jwt from 'jsonwebtoken';

/**
 * Creates a message token containing an expiration time that is transparent and unencrypted, and a
 * signature that verifies the token was created by LightningVend servers and prevents tampering.
 * @param expireTimeSeconds The lifetime of the message.
 * @param secret The LightningVend-owned secret.
 * Can later be used to verify the message's authenticity.
 * @returns A signed message token.
 */
export const createMessageTokenWithExpiration =
(expireTimeSeconds: number, secret: string): string => {
  return jwt.sign(`${new Date(Date.now() + 1000 * expireTimeSeconds).getTime()}`, secret);
};

export const messageIsAuthentic = (message: string, secret: string): boolean => {
  try {
    jwt.verify(message, secret);
    return true;
  } catch (err) {
    return false;
  }
};