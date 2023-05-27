import {AdminSessionManager} from './adminSessionManager';

describe('AdminSessionManager', () => {
  let adminSessionManager: AdminSessionManager;

  beforeEach(() => {
    adminSessionManager = new AdminSessionManager();
  });

  describe('getOrCreateAdminSession', () => {
    it('should create a new admin session if it does not exist', () => {
      const adminSessionId = 'session1';
      const lightningNodePubkey = 'pubkey1';

      const {isNew} = adminSessionManager.getOrCreateAdminSession(
        adminSessionId,
        lightningNodePubkey
      );

      expect(isNew).toBe(true);
      expect(adminSessionManager.getNodePubkeyFromSessionId(
        adminSessionId)).toBe(lightningNodePubkey);
    });

    it('should not update an existing admin session', () => {
      const adminSessionId = 'session1';
      const lightningNodePubkey = 'pubkey1';

      adminSessionManager.getOrCreateAdminSession(adminSessionId, lightningNodePubkey);

      const {isNew} = adminSessionManager.getOrCreateAdminSession(adminSessionId, 'newPubkey');

      expect(isNew).toBe(false);
      expect(adminSessionManager.getNodePubkeyFromSessionId(adminSessionId))
        .toBe(lightningNodePubkey);
    });
  });

  describe('getNodePubkeyFromSessionId', () => {
    it('should return the node pubkey for an existing admin session', () => {
      const adminSessionId = 'session1';
      const lightningNodePubkey = 'pubkey1';

      adminSessionManager.getOrCreateAdminSession(adminSessionId, lightningNodePubkey);

      const nodePubkey = adminSessionManager.getNodePubkeyFromSessionId(adminSessionId);

      expect(nodePubkey).toBe(lightningNodePubkey);
    });

    it('should return undefined for a non-existing admin session', () => {
      const adminSessionId = 'nonExistingSession';

      const nodePubkey = adminSessionManager.getNodePubkeyFromSessionId(adminSessionId);

      expect(nodePubkey).toBeUndefined();
    });
  });
});
