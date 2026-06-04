import createClient from "openapi-fetch";
import type { paths } from "src/api/types.ts";

export const client = createClient<paths>({
  baseUrl: "/",
});

export function displayError(error: unknown): void {
  const detail =
    typeof error === "object" && error !== null && "detail" in error
      ? (error as { detail?: unknown }).detail
      : undefined;

  const message =
    typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((e) => `${e.loc.join(".")}: ${e.msg}`).join("; ")
        : "An unknown error occurred";

  throw new Error(message);
}
