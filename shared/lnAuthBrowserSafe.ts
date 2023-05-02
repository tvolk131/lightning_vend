import decodeJwt from 'jwt-decode';

/**
 * Extracts the encoded expiration time from a given message.
 * @param message The message to decode.
 * @returns The expiration time of the message token, or undefined if the message is malformed or
 * contains a non-date value.
 */
export const getMessageExpiration = (message: string): Date | undefined => {
  const decodedMessage = decodeJwt(message);

  if (typeof decodedMessage !== 'number') {
    return undefined;
  }

  if (isNaN(decodedMessage)) {
    return undefined;
  }

  return new Date(decodedMessage);
};

export const messageIsMalformed = (message: string): boolean => {
  return getMessageExpiration(message) === undefined;
};

export const messageIsExpired = (message: string): boolean => {
  const messageExpirationTime = getMessageExpiration(message);

  if (messageExpirationTime === undefined) {
    return false;
  }

  return new Date() >= messageExpirationTime;
};