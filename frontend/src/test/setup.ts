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
  // jsdom has no Element.scrollBy. On <html> it moves the window, as it does in a browser, so a
  // spy on the window sees a reveal of the page and not one of an overlay.
  Element.prototype.scrollBy = () => {};
  document.documentElement.scrollBy = ((x: number, y: number) =>
    window.scrollBy(x, y)) as Element['scrollBy'];
  document.documentElement.setAttribute('data-reveal-scroller', '');
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterEach(() => cleanup());
afterAll(() => server.close());
