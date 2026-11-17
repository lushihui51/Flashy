// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSyncExternalStore } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { server } from 'src/test/server';
import {
  mockLoading,
  mockSignedOut,
  mockSignedIn,
  openSignIn,
  useUserMock,
} from 'src/test/mocks/clerk';
import AppShell from 'src/components/shell/AppShell';
import { loadHomeAfresh, useWriteGuard } from 'src/lib/viewer';

vi.mock('src/lib/viewer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/lib/viewer')>()),
  loadHomeAfresh: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSignedOut();
});

function renderShell(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    createRoutesFromElements(
      <Route element={<AppShell />}>
        <Route path="/" element={<div>home content</div>} />
      </Route>,
    ),
    { initialEntries },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AppShell', () => {
  it('renders the top bar and the routed page content, and no search', () => {
    renderShell();

    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });

  it('opens the side drawer when the hamburger is clicked', async () => {
    const user = userEvent.setup();
    renderShell();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    // Radix hides the rest of the page (including the now "Close menu"
    // hamburger) from the accessibility tree while the modal drawer is
    // trapped, so the queryable close paths here are Esc/scrim/item-click.
    expect(screen.getByRole('dialog', { name: 'Main menu' })).toBeInTheDocument();
  });

  it('closes the drawer when the hamburger is clicked again while open', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The hamburger is still visually the top bar's close control, and
    // remains genuinely clickable (pointer-events-auto overrides the
    // pointer-events:none Radix puts on <body> for everything else while
    // the modal drawer is trapped) — clicking it again should close it.
    await user.click(hamburger);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the hamburger when the drawer closes via Escape', async () => {
    const user = userEvent.setup();
    renderShell();

    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(hamburger).toHaveFocus();
  });

  it('opens the account sheet when the avatar is clicked, not the drawer, without navigating', async () => {
    mockSignedIn({ username: 'ada' });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /account menu/i }));

    expect(screen.getByRole('dialog', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText('home content')).toBeInTheDocument();
  });

  it('never has the drawer and the account sheet open at the same time', async () => {
    mockSignedIn({ username: 'ada' });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    // The drawer is modal: Radix hides everything outside its trapped
    // content from the accessibility tree (and blocks its pointer events),
    // so the avatar isn't even queryable while it's open — proving the two
    // overlays can't both be open through the UI.
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Main menu' })).toBeInTheDocument();
  });
});

describe('AppShell viewer', () => {
  it('draws the header and no page while the viewer is loading', () => {
    mockLoading();
    renderShell();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeEmptyDOMElement();
  });

  it('stops drawing the page and loads Home afresh once when the viewer changes between guest and user', () => {
    // Clerk's answer, held where a change re-renders the shell as Clerk's own hook would.
    let signedIn = false;
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };
    useUserMock.mockImplementation(() => {
      const isSignedIn = useSyncExternalStore(subscribe, () => signedIn);
      return { isLoaded: true, isSignedIn, user: isSignedIn ? { id: 'user_1' } : null };
    });
    const signIn = (next: boolean) =>
      act(() => {
        signedIn = next;
        listeners.forEach((listener) => listener());
      });

    for (const startsSignedIn of [false, true]) {
      vi.mocked(loadHomeAfresh).mockClear();
      signedIn = startsSignedIn;
      const { unmount } = renderShell();
      expect(screen.getByText('home content')).toBeInTheDocument();

      signIn(!startsSignedIn);
      expect(screen.queryByText('home content')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
      expect(loadHomeAfresh).toHaveBeenCalledTimes(1);

      signIn(startsSignedIn);
      signIn(!startsSignedIn);
      expect(loadHomeAfresh).toHaveBeenCalledTimes(1);
      unmount();
    }
  });
});

describe('AppShell header height', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--app-header-height');
  });

  it('writes the header height to --app-header-height, follows it, and stops on unmount', () => {
    let headerHeight = 114;
    let headerResized: () => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        callback: () => void;
        constructor(callback: () => void) {
          this.callback = callback;
        }
        observe(target: Element) {
          if (target.tagName === 'HEADER') headerResized = this.callback;
        }
        unobserve() {}
        disconnect = disconnect;
      },
    );
    const realRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.tagName === 'HEADER'
        ? new DOMRect(0, 0, 390, headerHeight)
        : realRect.call(this);
    });
    const readVariable = () =>
      document.documentElement.style.getPropertyValue('--app-header-height');

    const { unmount } = renderShell();
    expect(readVariable()).toBe('114px');

    headerHeight = 172;
    act(() => headerResized());
    expect(readVariable()).toBe('172px');

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe('AppShell connection banner', () => {
  // A user, so the guest's banner never stands among the statuses these cases read.
  beforeEach(() => {
    mockSignedIn();
  });

  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('shows no banner while the health probe answers ok', async () => {
    let probed = false;
    server.use(
      http.get('*/api/health', () => {
        probed = true;
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    renderShell();

    await waitFor(() => expect(probed).toBe(true));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the server-trouble banner when the probe answers 503', async () => {
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json(
          {
            detail: {
              code: 'database_unavailable',
              message: 'Flashy is temporarily unavailable.',
            },
          },
          { status: 503 },
        ),
      ),
    );
    renderShell();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Flashy is having trouble right now. Retrying automatically.',
    );
  });

  it("shows the can't-connect banner when the probe gets no response", async () => {
    server.use(http.get('*/api/health', () => HttpResponse.error()));
    renderShell();

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Can't reach Flashy. Check your connection; retrying automatically.",
    );
  });

  it('shows the offline banner when the browser goes offline', async () => {
    renderShell();
    act(() => onlineManager.setOnline(false));

    expect(await screen.findByRole('status')).toHaveTextContent(
      "You're offline. Flashy will reconnect automatically.",
    );
  });
});

describe('AppShell example banner', () => {
  it('shows the example banner to a guest, beneath the connection banner, and to no user', async () => {
    const example = 'This is an example. Log in to use all of Flashy.';
    server.use(
      http.get('*/api/health', () =>
        HttpResponse.json(
          { detail: { code: 'database_unavailable', message: 'x' } },
          { status: 503 },
        ),
      ),
    );
    const { unmount } = renderShell();

    await waitFor(() => expect(screen.getAllByRole('status')).toHaveLength(2));
    const [connection, guest] = screen.getAllByRole('status');
    expect(connection).toHaveTextContent(
      'Flashy is having trouble right now. Retrying automatically.',
    );
    expect(guest).toHaveTextContent(example);
    const topBarButton = screen.getByRole('button', { name: 'Open menu' });
    expect(
      guest!.compareDocumentPosition(topBarButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    unmount();

    mockSignedIn();
    renderShell();
    await screen.findByRole('status');
    expect(screen.queryByText(example)).not.toBeInTheDocument();
  });
});

describe('AppShell log-in prompt', () => {
  /** A page whose one control would write, beneath the shell, with a second page to go to. */
  function GuardedPage() {
    const guard = useWriteGuard();
    return (
      <button type="button" onClick={() => guard(() => {})}>
        Start run
      </button>
    );
  }

  it('opens the prompt from the context and closes it on a press on Log in and on a change of address', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
      createRoutesFromElements(
        <Route element={<AppShell />}>
          <Route path="/" element={<GuardedPage />} />
          <Route path="/practices" element={<div>practices content</div>} />
        </Route>,
      ),
      { initialEntries: ['/'] },
    );
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    const sentence = 'Log in to use all of Flashy.';
    const prompt = () => screen.queryByText(sentence, { selector: '[role="status"]' });

    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(prompt()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start run' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(prompt()).not.toBeInTheDocument();
    expect(openSignIn).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Start run' }));
    expect(prompt()).toBeInTheDocument();
    await act(() => router.navigate('/practices'));
    expect(screen.getByText('practices content')).toBeInTheDocument();
    expect(prompt()).not.toBeInTheDocument();
  });
});
