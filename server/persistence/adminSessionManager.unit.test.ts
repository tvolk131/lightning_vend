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
    });

    it('should not update an existing admin session', () => {
      const adminSessionId = 'session1';
      const lightningNodePubkey = 'pubkey1';

      const {isNew: isNew1, userName: userName1} =
        adminSessionManager.getOrCreateAdminSession(adminSessionId, lightningNodePubkey);

      const {isNew: isNew2, userName: userName2} =
        adminSessionManager.getOrCreateAdminSession(adminSessionId, lightningNodePubkey);

      expect(isNew1).toBe(true);
      expect(isNew2).toBe(false);
      expect(userName1.toString()).toEqual(userName2.toString());
    });
  });

  describe('getUserNameFromAdminSessionId', () => {
    it('should return the node pubkey for an existing admin session', () => {
      const adminSessionId = 'session1';
      const lightningNodePubkey = 'pubkey1';

      const {userName} = adminSessionManager.getOrCreateAdminSession(
        adminSessionId,
        lightningNodePubkey
      );

      expect(userName).toBeDefined();
      expect(adminSessionManager.getUserNameFromAdminSessionId(adminSessionId)?.toString())
        .toEqual(userName.toString());
    });

    it('should return undefined for a non-existing admin session', () => {
      const adminSessionId = 'nonExistingSession';

      const nodePubkey = adminSessionManager.getUserNameFromAdminSessionId(adminSessionId);

      expect(nodePubkey).toBeUndefined();
    });
  });
});
