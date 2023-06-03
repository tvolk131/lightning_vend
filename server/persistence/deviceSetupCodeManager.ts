import {deviceSetupCodeAllowedCharacters, deviceSetupCodeLength} from '../../shared/constants';

/**
 * Manages device setup codes.
 * Currently stores everything in memory, but will eventually use MongoDB to persist this data.
 * TODO - Read/write using non-volatile storage.
 */
export class DeviceSetupCodeManager {
  private codeToIdMap: Map<string, string>;
  private idToCodeMap: Map<string, string>;

  public constructor() {
    this.codeToIdMap = new Map();
    this.idToCodeMap = new Map();
  }

  // TODO - Set a TLL for new codes to be eventually discarded if they're unused.
  public generateCode(id: string): string {
    const existingCode = this.getCodeFromId(id);
    if (existingCode) {
      this.clearCode(existingCode);
    }

    let code = '';
    for (let i = 0; i < deviceSetupCodeLength; i++) {
      code += deviceSetupCodeAllowedCharacters.charAt(
        Math.floor(Math.random() * deviceSetupCodeAllowedCharacters.length));
    }

    // TODO - If all possible codes are taken, this will infinitely recurse. We should address this.
    if (this.codeToIdMap.has(code)) {
      return this.generateCode(id);
    }

    this.codeToIdMap.set(code, id);
    this.idToCodeMap.set(id, code);

    return code;
  }

  public getIdFromCode(code: string): string | undefined {
    return this.codeToIdMap.get(code);
  }

  public getCodeFromId(id: string): string | undefined {
    return this.idToCodeMap.get(id);
  }

  public clearCode(code: string) {
    const id = this.getIdFromCode(code);
    if (id) {
      this.idToCodeMap.delete(id);
      this.codeToIdMap.delete(code);
    }
  }
}
