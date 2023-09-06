import * as jwt from 'jsonwebtoken';
import {UserName} from '../../shared/proto';
import {userSessionTokenLifetimeMs} from '../../shared/constants';

// Manages user browser sessions. Sessions are backed by JsonWebTokens and are
// therefore stateless. The tokens are signed with a secret key that is only
// known to the server.
export class UserSessionManager {
  private signingSecret: string;

  public constructor (signingSecret: string) {
    this.signingSecret = signingSecret;
  }

  /**
   * Creates a user session token containing an expiration time and user name
   * that is transparent and unencrypted, and a signature that verifies the
   * token was created by LightningVend servers and prevents tampering.
   * @param userName The user name to associate with the token.
   * @param expireTimeSeconds The lifetime of the token.
   * @returns A signed and tamper-proof session token.
   **/
  public createUserSessionToken(userName: UserName): string {
    const expiration = Date.now() + userSessionTokenLifetimeMs;
    return jwt.sign(
      {
        userName: userName.toString(),
        expiration
      },
      this.signingSecret
    );
  }

  /**
   * Verifies that a given session token is authentic and has not expired. Only
   * returns the user name associated with the session token if the token is
   * authentic and has not expired.
   * @param sessionToken The session token to verify.
   * @returns The user name associated with the session token, or undefined if
   * the token is invalid or has expired.
   **/
  public verifyUserSessionToken(
    userSessionToken: string
  ): UserName | undefined {
    try {
      const decodedToken = jwt.verify(userSessionToken, this.signingSecret);
      if (typeof decodedToken === 'string') {
        return undefined;
      }
      if (typeof decodedToken.expiration !== 'number' ||
          isNaN(decodedToken.expiration)) {
        return undefined;
      }
      if (typeof decodedToken.userName !== 'string') {
        return undefined;
      }
      const userName = UserName.parse(decodedToken.userName);
      const expiration = new Date(decodedToken.expiration);

      if (userName === undefined) {
        return undefined;
      }

      if (expiration < new Date()) {
        return undefined;
      }

      return userName;
    } catch (err) {
      return undefined;
    }
  }
}
