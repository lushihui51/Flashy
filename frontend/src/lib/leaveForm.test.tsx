// @vitest-environment jsdom
import { useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  useLocation,
  type DataRouter,
} from 'react-router-dom';
import { hasEarlierPage } from 'src/lib/historyIndex';
import { useLeaveForm } from 'src/lib/leaveForm';

// The mounted form's leave, for the test to call.
const mounted: { leave?: ReturnType<typeof useLeaveForm> } = {};

function leave(target: string, state?: Record<string, unknown>) {
  return mounted.leave!(target, state);
}

function Form() {
  const leaveForm = useLeaveForm();
  useEffect(() => {
    mounted.leave = leaveForm;
  }, [leaveForm]);
  return <p data-testid="form">form</p>;
}

function Page() {
  const location = useLocation();
  return <p data-testid="page">{`${location.pathname}${location.search}`}</p>;
}

// A browser router over jsdom's history, since stepping back to the opener happens only
// where the router keeps its position in the browser's history.
function openAt(path: string): DataRouter {
  window.history.replaceState(null, '', path);
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/form" element={<Form />} />
        <Route path="*" element={<Page />} />
      </>,
    ),
  );
  render(<RouterProvider router={router} />);
  return router;
}

function historyIndex(): unknown {
  return window.history.state?.idx;
}

describe('useLeaveForm', () => {
  let router: DataRouter;

  afterEach(() => {
    router.dispose();
  });

  // '/' then the opener then the form, so the opener has an earlier page of its own.
  async function openFormOverOpener(opener: string) {
    router = openAt('/');
    await act(() => router.navigate(opener));
    const opened = { key: router.state.location.key, hadEarlierPage: hasEarlierPage() };
    await act(() => router.navigate('/form'));
    expect(screen.getByTestId('form')).toBeInTheDocument();
    return opened;
  }

  it("leaving for the opener's own address steps back to the opener's entry, with no replace", async () => {
    const opened = await openFormOverOpener('/opener?tab=decks');

    await act(() => leave('/opener?tab=decks'));

    expect(router.state.location.pathname).toBe('/opener');
    expect(router.state.location.search).toBe('?tab=decks');
    expect(router.state.location.key).toBe(opened.key);
    expect(historyIndex()).toBe(1);
    expect(hasEarlierPage()).toBe(opened.hadEarlierPage);
    expect(screen.getByTestId('page')).toHaveTextContent('/opener?tab=decks');
  });

  it("leaving for another address replaces the opener's entry with it", async () => {
    const opened = await openFormOverOpener('/opener');

    await act(() => leave('/decks/d9'));

    expect(router.state.location.pathname).toBe('/decks/d9');
    expect(router.state.location.key).not.toBe(opened.key);
    expect(historyIndex()).toBe(1);
    expect(screen.getByTestId('page')).toHaveTextContent('/decks/d9');

    // The entry before the opener's is still the one before.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/');
  });

  it("leaving with state delivers it on the opener's address", async () => {
    const opened = await openFormOverOpener('/cards/new');

    await act(() => leave('/cards/new', { deckId: 'd9' }));

    expect(router.state.location.pathname).toBe('/cards/new');
    expect(router.state.location.state).toEqual({ deckId: 'd9' });
    expect(router.state.location.key).not.toBe(opened.key);
    expect(historyIndex()).toBe(1);
  });

  it("with no earlier page, the form's own entry is replaced", async () => {
    router = openAt('/form');
    expect(hasEarlierPage()).toBe(false);

    await act(() => leave('/library', { deckId: 'd9' }));

    expect(router.state.location.pathname).toBe('/library');
    expect(router.state.location.state).toEqual({ deckId: 'd9' });
    expect(historyIndex()).toBe(0);
    expect(hasEarlierPage()).toBe(false);
  });
});
