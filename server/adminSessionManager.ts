import {DeviceData} from '../proto/lightning_vend/model';

export interface AdminData {
  lightningNodePubkey: string,
  devices: AdminDeviceView[]
}

export interface AdminDeviceView {
  isOnline: boolean
  deviceData: DeviceData
}

/**
 * Manages the persistence of admin sessions.
 * Currently stores everything in memory, but will eventually use MongoDB to persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class AdminSessionManager {
  /**
   * Maps admin session ids to the node pubkey that's logged in.
   */
  private adminSessions: Map<string, string> = new Map();

  /**
   * Performs a find-or-create for an admin session.
   * @param adminSessionId The session we're fetching.
   * @param lightningNodePubkey The Lightning Network node that this session
   * should belong to. If the session already exists, this field is ignored
   * and _not_ updated or validated.
   * @returns A flag indicating whether `adminSessionId` mapped to an existing session.
   */
  getOrCreateAdminSession(adminSessionId: string, lightningNodePubkey: string): {isNew: boolean} {
    let isNew = false;

    if (!this.adminSessions.has(adminSessionId)) {
      this.adminSessions.set(adminSessionId, lightningNodePubkey);
      isNew = true;
    }

    return {isNew};
  }

  /**
   * Retrieves an admin session.
   * @param adminSessionId The session we're fetching.
   * @returns The Lightning Network node pubkey that an existing admin session is tied to
   */
  getNodePubkeyFromSessionId(adminSessionId: string): string | undefined {
    return this.adminSessions.get(adminSessionId);
  }
}