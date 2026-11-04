// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  type DataRouter,
} from 'react-router-dom';
import { hasEarlierPage } from 'src/lib/historyIndex';

// A browser router, since the answer comes from the position the router keeps in the
// browser's history, which a memory router never writes.
function openRouter(): DataRouter {
  return createBrowserRouter(createRoutesFromElements(<Route path="*" element={null} />));
}

describe('hasEarlierPage', () => {
  let router: DataRouter;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    router = openRouter();
  });

  afterEach(() => {
    router.dispose();
  });

  it('is false on the entry the page was opened at', () => {
    expect(hasEarlierPage()).toBe(false);
  });

  it('stays false after a replace on that entry', async () => {
    await router.navigate('/?tab=decks', { replace: true });

    expect(router.state.location.search).toBe('?tab=decks');
    expect(hasEarlierPage()).toBe(false);
  });

  it('is true after a push', async () => {
    await router.navigate('/decks/d1');

    expect(hasEarlierPage()).toBe(true);
  });

  it('stays true after a replace on the pushed entry', async () => {
    await router.navigate('/decks/d1');
    await router.navigate('/decks/d1?tab=configurations', { replace: true });

    expect(router.state.location.search).toBe('?tab=configurations');
    expect(hasEarlierPage()).toBe(true);
  });

  it('is false again after going back', async () => {
    await router.navigate('/decks/d1');
    expect(hasEarlierPage()).toBe(true);

    await router.navigate(-1);

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(hasEarlierPage()).toBe(false);
  });
});
