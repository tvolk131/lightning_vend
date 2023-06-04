import {Device, User} from '../../proto/lightning_vend/model';
import {UserName} from '../../shared/proto';

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
   * Maps user session ids to the name of the user that's logged in.
   */
  private userSessions: Map<string, UserName> = new Map();

  /**
   * Maps user names to the user that's logged in.
   */
  private usersByName: Map<string, User> = new Map();

  /**
   * Maps user names to the Lightning Network
   * node pubkey that identifies the user.
   * TODO - This is only used to check if a user
   * exists already. We can use a Set<string> instead.
   */
  private userNamesByLightningNodePubkey: Map<string, UserName> = new Map();

  /**
   * Performs a find-or-create for an admin session.
   * @param adminSessionId The session we're fetching.
   * @param lightningNodePubkey The Lightning Network node that this session
   * should belong to. If the session already exists, this field is ignored
   * and _not_ updated or validated.
   * @returns The resource name of the user and a flag indicating
   * whether `adminSessionId` mapped to an existing session.
   */
  public getOrCreateAdminSession(
    adminSessionId: string, lightningNodePubkey: string
  ): {isNew: boolean, userName: UserName} {
    let isNew = false;

    let userName = this.userNamesByLightningNodePubkey.get(lightningNodePubkey);

    // If the user doesn't exist, create it.
    if (!userName) {
      userName = UserName.create();
      this.userNamesByLightningNodePubkey.set(lightningNodePubkey, userName);
      this.usersByName.set(userName.toString(), {
        name: userName.toString(),
        lightningNodePubkey
      });
    }

    // If the session doesn't exist, create it.
    if (!this.userSessions.has(adminSessionId)) {
      this.userSessions.set(adminSessionId, userName);
      isNew = true;
    }

    return {isNew, userName};
  }

  /**
   * Retrieves an admin session.
   * @param adminSessionId The session we're fetching.
   * @returns The Lightning Network node pubkey
   * that an existing admin session is tied to
   */
  public getUserNameFromAdminSessionId(
    adminSessionId: string
  ): UserName | undefined {
    return this.userSessions.get(adminSessionId);
  }
}