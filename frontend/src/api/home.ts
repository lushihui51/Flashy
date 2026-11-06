import { client } from 'src/api/client';
import { unwrap } from 'src/api/unwrap';

export const readHome = async () => unwrap(await client.GET('/api/home'));
