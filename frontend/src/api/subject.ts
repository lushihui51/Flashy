import { client } from 'src/api/client';
import { unwrap, unwrapVoid } from 'src/api/unwrap';
import type { components } from 'src/api/types';

export const createSubject = async (payload: components['schemas']['SubjectCreate']) =>
  unwrap(await client.POST('/api/subjects', { body: payload }));

export const readSubject = async (subjectId: string) =>
  unwrap(await client.GET('/api/subjects/{subject_id}', { params: { path: { subject_id: subjectId } } }));

export const readSubjects = async () => unwrap(await client.GET('/api/subjects', {}));

export const updateSubject = async (
  subjectId: string,
  payload: components['schemas']['SubjectUpdate'],
) =>
  unwrap(
    await client.PATCH('/api/subjects/{subject_id}', {
      params: { path: { subject_id: subjectId } },
      body: payload,
    }),
  );

export const deleteSubject = async (subjectId: string) =>
  unwrapVoid(await client.DELETE('/api/subjects/{subject_id}', { params: { path: { subject_id: subjectId } } }));
