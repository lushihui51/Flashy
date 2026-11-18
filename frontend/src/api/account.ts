import { client } from 'src/api/client';
import { unwrapVoid } from 'src/api/unwrap';

/** Deletes the signed-in user's account, at Clerk and in Flashy, with everything in it. */
export const deleteAccount = async (): Promise<void> =>
  unwrapVoid(await client.DELETE('/api/account'));
