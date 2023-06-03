import {DeviceSetupCodeManager} from './deviceSetupCodeManager';

describe('CodeGenerator', () => {
  let generator: DeviceSetupCodeManager;

  beforeEach(() => {
    generator = new DeviceSetupCodeManager();
  });

  describe('generateCode', () => {
    it('should generate a unique code for a given identifier', () => {
      const id1 = 'user123';
      const id2 = 'product456';
      const code1 = generator.generateCode(id1);
      const code2 = generator.generateCode(id2);

      expect(code1).not.toBe(code2);
    });

    it('should generate a 4-character alphanumeric code', () => {
      const id = 'someId';
      const code = generator.generateCode(id);

      expect(code).toMatch(/^[a-zA-Z0-9]{4}$/);
    });

    it('should generate a different code each time for the same identifier', () => {
      const id = 'user123';
      const code1 = generator.generateCode(id);
      const code2 = generator.generateCode(id);

      expect(code1).not.toBe(code2);
      expect(generator.getIdFromCode(code1)).toBeUndefined();
    });
  });

  describe('collision avoidance', () => {
    it('should avoid collisions when generating large numbers of codes', () => {
      const NUM_IDENTIFIERS = 20000;

      const identifiers: string[] = [];
      for (let i = 0; i < NUM_IDENTIFIERS; i++) {
        identifiers.push(`id${i}`);
      }

      const codes: string[] = [];
      for (const id of identifiers) {
        const code = generator.generateCode(id);
        expect(codes).not.toContain(code);
        codes.push(code);
      }
    });
  });

  describe('getIdFromCode', () => {
    it('should return the corresponding identifier for a valid code', () => {
      const id = 'user123';
      const code = generator.generateCode(id);
      const retrievedId = generator.getIdFromCode(code);

      expect(retrievedId).toBe(id);
    });

    it('should return undefined for an invalid code', () => {
      const retrievedId = generator.getIdFromCode('invalidcode');

      expect(retrievedId).toBeUndefined();
    });
  });

  describe('getCodeFromId', () => {
    it('should return the corresponding code for a valid identifier', () => {
      const id = 'user123';
      const code = generator.generateCode(id);
      const retrievedCode = generator.getCodeFromId(id);

      expect(retrievedCode).toBe(code);
    });

    it('should return undefined for an invalid identifier', () => {
      const retrievedCode = generator.getCodeFromId('invalidid');

      expect(retrievedCode).toBeUndefined();
    });
  });

  describe('clearCode', () => {
    it('properly clears code', () => {
      const id = 'user123';
      const code = generator.generateCode(id);

      // Sanity check.
      expect(generator.getIdFromCode(code)).toBeDefined();
      expect(generator.getCodeFromId(id)).toBeDefined();

      generator.clearCode(code);

      expect(generator.getIdFromCode(code)).toBeUndefined();
      expect(generator.getCodeFromId(id)).toBeUndefined();
    });

    it('should handle unregistered code', () => {
      generator.clearCode('');
    });
  });

  describe('edge cases and errors', () => {
    it('should handle empty input for getIdFromCode', () => {
      const retrievedId = generator.getIdFromCode('');

      expect(retrievedId).toBeUndefined();
    });

    it('should handle empty input for getCodeFromId', () => {
      const retrievedCode = generator.getCodeFromId('');

      expect(retrievedCode).toBeUndefined();
    });
  });
});