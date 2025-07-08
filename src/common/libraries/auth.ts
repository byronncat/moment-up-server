import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { nanoid, customAlphabet } from 'nanoid';

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789';

export async function hash(password: string, saltRounds: number): Promise<string> {
  try {
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('[AuthLib]', error);
    throw new Error('Failed to hash password');
  }
}

export async function compare(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateId(type: 'uuid' | 'nanoid' | 'otp', options?: { length?: number }): string {
  if (type === 'uuid') return uuidv4();
  if (type === 'otp') {
    const alphanumeric = customAlphabet(ALPHANUM);
    return alphanumeric(options?.length ?? 6);
  }
  return nanoid(options?.length ?? 10);
}
