const makeId = (length: number): string => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Generates a 20-character ID where each character is one of 62 possible characters.
// 62^20 is approximately 7*10^35 possibilities, which is safe enough that we're not
// worrying about collisions.
export const makeUuid = () => makeId(20);