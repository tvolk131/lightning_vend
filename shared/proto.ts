import {makeUuid} from './uuid';

// Represents a unique resource identifer for a User.
// This is a top-level resource, so it has no parent.
// Formatted as: `users/{user}`.
export class UserName {
  private readonly user: string;

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

  public getUserSegment(): string {
    return this.user;
  }
}

// Represents a unique resource identifer for a UnclaimedDevice.
// This is a top-level resource, so it has no parent.
// Formatted as: `unclaimedDevices/{unclaimed_device}`.
export class UnclaimedDeviceName {
  private readonly unclaimedDevice: string;

  private constructor(name: string) {
    const match = name.match(/^unclaimedDevices\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid unclaimed device name: ${name}`);
    }
    this.unclaimedDevice = match[1];
  }

  public static parse(name: string): UnclaimedDeviceName | undefined {
    try {
      return new UnclaimedDeviceName(name);
    } catch (e) {
      return undefined;
    }
  }

  public static create(): UnclaimedDeviceName {
    return new UnclaimedDeviceName(`unclaimedDevices/${makeUuid()}`);
  }

  public toString(): string {
    return `unclaimedDevices/${this.unclaimedDevice}`;
  }

  public getUnclaimedDeviceSegment(): string {
    return this.unclaimedDevice;
  }
}

// Represents a unique resource identifer for a Device.
// This resource is a child of a User.
// Formatted as: `users/{user}/devices/{device}`.
export class DeviceName {
  private readonly user: string;
  private readonly device: string;

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

  public equals(other: DeviceName): boolean {
    return this.toString() === other.toString();
  }
}
