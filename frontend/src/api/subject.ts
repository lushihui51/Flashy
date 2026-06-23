import { client, displayError } from "src/api/client";
import type { components } from "src/api/types";

export const createSubject = async (
  payload: components["schemas"]["SubjectCreate"],
) => {
  const { data, error } = await client.POST("/api/subjects/subject", {
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readSubject = async (id: string) => {
  const { data, error } = await client.GET("/api/subjects/subject/{id}", {
    params: { path: { id: id } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const readSubjects = async () => {
  const { data, error } = await client.GET("/api/subjects/subjects", {});
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const updateSubject = async (
  id: string,
  payload: components["schemas"]["SubjectUpdate"],
) => {
  const { data, error } = await client.PATCH("/api/subjects/subject/{id}", {
    params: { path: { id: id } },
    body: payload,
  });
  if (error) {
    displayError(error);
    throw error;
  }
  return data;
};

export const deleteSubject = async (id: string) => {
  const { error } = await client.DELETE("/api/subjects/subject/{id}", {
    params: { path: { id: id } },
  });
  if (error) {
    displayError(error);
    throw error;
  }
};
