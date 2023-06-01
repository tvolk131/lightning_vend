import {makeUuid} from './uuid';

// Represents a unique resource identifer for a User.
// This is a top-level resource, so it has no parent.
// Formatted as: `users/{user}`.
export class UserName {
  // TODO - Make this field private.
  public readonly user: string;

  private constructor(name: string) {
    const match = name.match(/^users\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid user name: ${name}`);
    }
    this.user = match[1];
  }

  public static parse(name: string): UserName | undefined {
    try {
      return new UserName(name);
    } catch (e) {
      return undefined;
    }
  }

  public static create(): UserName {
    return new UserName(`users/${makeUuid()}`);
  }

  public toString(): string {
    return `users/${this.user}`;
  }
}

// Represents a unique resource identifer for a Device.
// This resource is a child of a User.
// Formatted as: `users/{user}/devices/{device}`.
export class DeviceName {
  // TODO - Make this field private.
  public readonly user: string;
  // TODO - Make this field private.
  public readonly device: string;

  private constructor(name: string) {
    const match = name.match(/^users\/(.+)\/devices\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid device name: ${name}`);
    }
    this.user = match[1];
    this.device = match[2];
  }

  public static parse(name: string): DeviceName | undefined {
    try {
      return new DeviceName(name);
    } catch (e) {
      return undefined;
    }
  }

  public static createFromParent(user: UserName): DeviceName {
    return new DeviceName(`${user.toString()}/devices/${makeUuid()}`);
  }

  public toString(): string {
    return `users/${this.user}/devices/${this.device}`;
  }

  public getUserName(): UserName {
    return UserName.parse(`users/${this.user}`)!;
  }
}
