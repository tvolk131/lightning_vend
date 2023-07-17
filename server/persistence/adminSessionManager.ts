import * as jwt from 'jsonwebtoken';
import {Device, User, User_AuthId} from '../../proto_out/lightning_vend/model';
import {UserName} from '../../shared/proto';
import {userSessionJwtSecret} from '../lndApi';
import {userSessionTokenLifetimeMs} from '../../shared/constants';

export interface AdminData {
  userName: UserName,
  deviceViews: AdminDeviceView[]
}

export interface AdminDeviceView {
  isOnline: boolean
  device: Device
}

/**
 * Manages the persistence of admin sessions.
 * Currently stores everything in memory, but will
 * eventually use MongoDB to persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class AdminSessionManager {
  /**
   * Signs and parses user session ids that contain data on what user is logged
   * in.
   */
  private userSessionManager: UserSessionManager =
    new UserSessionManager(userSessionJwtSecret);

  /**
   * Maps user names to the user that's logged in.
   */
  private usersByName: Map<string, User> = new Map();

  /**
   * Maps user names to the Lightning Network node pubkey that identifies the
   * user.
   */
  private userNamesByLightningNodePubkey: Map<string, UserName> = new Map();

  /**
   * Create a signed user session token that is tied to a particular user,
   * creating the user if it doesn't exist for the given `lightningNodePubkey`.
   * @param lightningNodePubkey The Lightning Network node that this session
   * should belong to. If the session already exists, this field is ignored
   * and _not_ updated or validated.
   * @returns A signed and tamper-proof session token.
   */
  public createUserSessionToken(lightningNodePubkey: string): string {
    let userName = this.userNamesByLightningNodePubkey.get(lightningNodePubkey);

    // If the user doesn't exist, create it.
    if (!userName) {
      const now = new Date();
      userName = UserName.create();
      this.userNamesByLightningNodePubkey.set(lightningNodePubkey, userName);
      this.usersByName.set(userName.toString(), {
        name: userName.toString(),
        createTime: now,
        updateTime: now,
        authId: User_AuthId.create({
          lightningNodePubkey
        })
      });
    }

    return this.userSessionManager.createUserSessionToken(userName);
  }

  /**
   * Retrieves an admin session.
   * @param userSessionToken The user session token we're decoding and
   * verifying.
   * @returns The resource name of the user that a user session token is
   * associated with. Returns undefined if the token is invalid, has expired, or
   * is not associated with an existing user.
   */
  public getUserNameFromUserSessionToken(
    userSessionToken: string
  ): UserName | undefined {
    const userName =
      this.userSessionManager.verifyUserSessionToken(userSessionToken);

      if (!userName) {
        return undefined;
      }

    if (!this.usersByName.has(userName.toString())) {
      return undefined;
    }

    return userName;
  }
}

// Manages user browser sessions. Sessions are backed by JsonWebTokens and are
// therefore stateless. The tokens are signed with a secret key that is only
// known to the server.
class UserSessionManager {
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
