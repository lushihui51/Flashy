import { afterAll, afterEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { server } from 'src/test/server';

// jsdom has no ResizeObserver — @radix-ui/react-popover's Arrow measures its anchor
// via @radix-ui/react-use-size, which needs one to exist at all (it never needs to
// actually fire for these tests, since jsdom performs no real layout).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterEach(() => cleanup());
afterAll(() => server.close());
