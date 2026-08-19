import { client, displayError } from 'src/api/client';
import type { components } from 'src/api/types';

export const createSubject = async (payload: components['schemas']['SubjectCreate']) => {
  const { data, error } = await client.POST('/api/subjects', {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readSubject = async (subjectId: string) => {
  const { data, error } = await client.GET('/api/subjects/{subject_id}', {
    params: { path: { subject_id: subjectId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readSubjects = async () => {
  const { data, error } = await client.GET('/api/subjects', {});
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateSubject = async (
  subjectId: string,
  payload: components['schemas']['SubjectUpdate'],
) => {
  const { data, error } = await client.PATCH('/api/subjects/{subject_id}', {
    params: { path: { subject_id: subjectId } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const deleteSubject = async (subjectId: string) => {
  const { error } = await client.DELETE('/api/subjects/{subject_id}', {
    params: { path: { subject_id: subjectId } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
