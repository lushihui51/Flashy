import { describe, expect, it } from 'vitest';
import { ApiDetailError, unwrap, unwrapVoid } from 'src/api/unwrap';

describe('unwrap', () => {
  it('returns data when there is no error', () => {
    expect(unwrap({ data: { id: '1' } })).toEqual({ id: '1' });
  });

  it('throws ApiDetailError exposing detail.code and detail.config_id for a structured error', () => {
    const error = {
      detail: {
        code: 'stale_config',
        message: 'field ids not live on this deck: [...]',
        config_id: '00000000-0000-0000-0000-000000000401',
      },
    };

    let thrown: unknown;
    try {
      unwrap({ error });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ApiDetailError);
    const apiError = thrown as ApiDetailError;
    expect(apiError.detail.code).toBe('stale_config');
    expect(apiError.detail.config_id).toBe('00000000-0000-0000-0000-000000000401');
    expect(apiError.message).toBe('field ids not live on this deck: [...]');
  });

  it('throws ApiDetailError with detail.config_id undefined when the response omits it', () => {
    const error = { detail: { code: 'duplicate_deck', message: 'Deck already has a config' } };

    let thrown: unknown;
    try {
      unwrap({ error });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ApiDetailError);
    expect((thrown as ApiDetailError).detail.config_id).toBeUndefined();
  });

  it('throws a plain Error, not ApiDetailError, for a string detail', () => {
    let thrown: unknown;
    try {
      unwrap({ error: { detail: 'Practice session not found' } });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
    expect((thrown as Error).message).toBe('Practice session not found');
  });

  it('throws a plain Error, not ApiDetailError, for a 422 validation array detail', () => {
    const error = {
      detail: [{ loc: ['body', 'name'], msg: 'Field required', type: 'missing' }],
    };

    let thrown: unknown;
    try {
      unwrap({ error });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
    expect((thrown as Error).message).toBe('body.name: Field required');
  });

  it('throws a plain Error, not ApiDetailError, for an object detail missing a string code', () => {
    // Same shape session-start errors used to fall back to before ADR 022 — message-only
    // object details (no `code`) must keep throwing a plain Error, not the new type.
    let thrown: unknown;
    try {
      unwrap({ error: { detail: { message: 'Something went wrong' } } });
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
    expect(unwrapVoid({})).toBeUndefined();
  });

  it('throws ApiDetailError for a structured error', () => {
    const error = { detail: { code: 'config_not_found', message: 'Config not found' } };

    let thrown: unknown;
    try {
      unwrapVoid({ error });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(ApiDetailError);
    expect((thrown as ApiDetailError).detail.code).toBe('config_not_found');
  });

  it('throws a plain Error for an unstructured error', () => {
    let thrown: unknown;
    try {
      unwrapVoid({ error: { detail: 'Practice session not found' } });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ApiDetailError);
  });
});
