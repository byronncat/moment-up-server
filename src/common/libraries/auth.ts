import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export async function hash(password: string, saltRounds: number): Promise<string> {
  return await bcrypt.hash(password, saltRounds);
}

export async function compare(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateJti(): string {
  return uuidv4();
}
