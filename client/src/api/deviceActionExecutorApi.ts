import axios from 'axios';

export const getActions = async (): Promise<string[]> => {
  return (await axios.get('http://localhost:3000/actions')).data;
}

export const performAction = async (actionName: string): Promise<void> => {
  await axios.post(`http://localhost:3000/action/${actionName}`);
}