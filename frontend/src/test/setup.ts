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

// jsdom does no layout either, so it has no scroll position and answers a scroll with a
// "Not implemented" line; the router's scroll restoration and the reveal after a tab or
// filter change would print one on every page test.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
  window.scrollBy = () => {};
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterEach(() => cleanup());
afterAll(() => server.close());
