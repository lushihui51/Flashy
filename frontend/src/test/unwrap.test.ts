import { describe, expect, it } from 'vitest';
import {
  ApiDetailError,
  ApiError,
  SERVER_TROUBLE_MESSAGE,
  isNotFound,
  unwrap,
  unwrapVoid,
} from 'src/api/unwrap';

const res = (status: number) => new Response(null, { status });

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe('unwrap', () => {
  it('returns data when there is no error', () => {
    expect(unwrap({ data: { id: '1' }, response: res(200) })).toEqual({ id: '1' });
  });

  it('throws ApiDetailError exposing detail.code for a structured error', () => {
    const error = {
      detail: { code: 'practice_has_active_run', message: "the run's practice has an active run" },
    };

    let thrown: unknown;
    try {
      unwrap({ error, response: res(400) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ApiDetailError);
    const apiError = thrown as ApiDetailError;
    expect(apiError.detail).toEqual({
      code: 'practice_has_active_run',
      message: "the run's practice has an active run",
    });
    expect(apiError.message).toBe("the run's practice has an active run");
  });

  it('throws a plain Error, not ApiDetailError, for a string detail', () => {
    let thrown: unknown;
    try {
      unwrap({ error: { detail: 'Practice not found' }, response: res(404) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
    expect((thrown as Error).message).toBe('Practice not found');
  });

  it('throws a plain Error, not ApiDetailError, for a 422 validation array detail', () => {
    const error = {
      detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }],
    };

    let thrown: unknown;
    try {
      unwrap({ error, response: res(422) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
    expect((thrown as Error).message).toBe('body.name: Field required');
  });

  it('throws a plain Error, not ApiDetailError, for an object detail missing a string code', () => {
    let thrown: unknown;
    try {
      unwrap({ error: { detail: { message: 'Something went wrong' } }, response: res(500) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
    expect((thrown as Error).message).toBe('Something went wrong');
  });
});

describe('unwrapVoid', () => {
  it('returns undefined when there is no error', () => {
    expect(unwrapVoid({ response: res(204) })).toBeUndefined();
  });

  it('throws ApiDetailError for a structured error', () => {
    const error = { detail: { code: 'no_cards', message: 'the run has no card' } };

    let thrown: unknown;
    try {
      unwrapVoid({ error, response: res(409) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ApiDetailError);
    expect((thrown as ApiDetailError).detail.code).toBe('no_cards');
  });

  it('throws a plain Error for an unstructured error', () => {
    let thrown: unknown;
    try {
      unwrapVoid({ error: { detail: 'Practice not found' }, response: res(404) });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
  });
});

describe('ApiError status', () => {
  it('exposes status on every thrown error', () => {
    const plain = thrownBy(() => unwrap({ error: { detail: 'Deck not found' }, response: res(404) }));
    expect(plain).toBeInstanceOf(ApiError);
    expect((plain as ApiError).status).toBe(404);

    const structured = thrownBy(() =>
      unwrapVoid({
        error: { detail: { code: 'run_active', message: 'the run is still active' } },
        response: res(409),
      }),
    );
    expect((structured as ApiError).status).toBe(409);
  });

  it('makes ApiDetailError an instanceof ApiError', () => {
    const thrown = thrownBy(() =>
      unwrap({ error: { detail: { code: 'run_active', message: 'active' } }, response: res(409) }),
    );
    expect(thrown).toBeInstanceOf(ApiDetailError);
    expect(thrown).toBeInstanceOf(ApiError);
  });

  it('throws server trouble for an empty-string error on a 502', () => {
    const thrown = thrownBy(() => unwrap({ error: '', response: res(502) }));
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(502);
    expect((thrown as ApiError).message).toBe(SERVER_TROUBLE_MESSAGE);
  });

  it('throws server trouble for an undefined error on a 503', () => {
    const thrown = thrownBy(() => unwrap({ error: undefined, response: res(503) }));
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(503);
    expect((thrown as ApiError).message).toBe(SERVER_TROUBLE_MESSAGE);
  });

  it("throws server trouble for FastAPI's plain-text 500", () => {
    const thrown = thrownBy(() => unwrap({ error: 'Internal Server Error', response: res(500) }));
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).message).toBe(SERVER_TROUBLE_MESSAGE);
  });

  it('throws the unknown-error text for a non-5xx with no usable detail', () => {
    const thrown = thrownBy(() => unwrap({ error: {}, response: res(418) }));
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(418);
    expect((thrown as ApiError).message).toBe(
      'An unknown error occurred (Inspect console for details)',
    );
  });
});

describe('isNotFound', () => {
  it('holds only for an ApiError with status 404', () => {
    expect(isNotFound(new ApiError(404, 'Deck not found'))).toBe(true);
    expect(isNotFound(new ApiError(500, 'boom'))).toBe(false);
    expect(isNotFound(new Error('Deck not found'))).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
  });
});
