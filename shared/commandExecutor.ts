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
