import {Result, err, ok} from 'neverthrow';
import axios from 'axios';

export const listCommands =
async (): Promise<Result<ExecutionCommands, string>> => {
  const res = await axios.get('http://localhost:21000/listCommands');

  const nullCommands = getStringArrayField(res.data, 'nullCommands');
  const boolCommands = getStringArrayField(res.data, 'boolCommands');

  if (!(nullCommands && boolCommands)) {
    return err('Invalid response from server');
  }

  return ok({
    nullCommands,
    boolCommands
  });
};

const getStringArrayField = (obj: any, field: string): string[] | undefined => {
  if (
    typeof obj === 'object' &&
    obj !== null &&
    field in obj &&
    Array.isArray(obj[field]) &&
    obj[field].every((item: any) => typeof item === 'string')
  ) {
    return obj[field];
  } else {
    return undefined;
  }
};

export interface ExecutionCommands {
  nullCommands: string[],
  boolCommands: string[]
}

// TODO - Test this function.
export const executionCommandsAreEqual = (
  first: ExecutionCommands,
  second: ExecutionCommands
): boolean => {
  if ([...first.nullCommands].sort() !== [...second.nullCommands].sort()) {
    return false;
  }

  if ([...first.boolCommands].sort() !== [...second.boolCommands].sort()) {
    return false;
  }

  return true;
};
