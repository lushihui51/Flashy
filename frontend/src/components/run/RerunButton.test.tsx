// @vitest-environment jsdom
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import RerunButton from 'src/components/run/RerunButton';
import { NO_CARDS_MESSAGE } from 'src/lib/runCopy';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import { mockSignedOut } from 'src/test/mocks/clerk';
import { GuestScrimContext } from 'src/lib/viewer';

const BASE = 'http://localhost:8000';
const NEW_RUN = {
  id: 'run2',
  practice_id: 'practice1',
  status: 'active',
  day: '2026-11-03',
  day_index: 1,
  created_at: '2026-11-03T18:00:00Z',
  last_activity_at: '2026-11-03T18:00:00Z',
};

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

/** The method and path of every request other than a GET sent from here to the test's end. */
function recordWrites(): string[] {
  const writes: string[] = [];
  const record = ({ request }: { request: Request }) => {
    if (request.method !== 'GET') writes.push(`${request.method} ${new URL(request.url).pathname}`);
  };
  server.events.on('request:start', record);
  onTestFinished(() => {
    server.events.removeListener('request:start', record);
  });
  return writes;
}

/** Renders the button; `dimScreen` stands for the shell's dimming of the screen. */
function renderButton(
  onError: (sentence: string) => void = () => {},
  dimScreen: () => void = () => {},
) {
  return renderWithProviders(
    <GuestScrimContext.Provider value={dimScreen}>
      <RerunButton runId="run1" onError={onError} />
      <LocationProbe />
    </GuestScrimContext.Provider>,
  );
}

afterEach(() => server.resetHandlers());

describe('RerunButton', () => {
  it('is spoken and drawn as Re-run alone, a yellow button as wide as its container', () => {
    renderButton();

    const button = screen.getByRole('button', { name: 'Re-run' });
    expect(button.textContent).toBe('Re-run');
    expect(button.children).toHaveLength(0);
    expect(button).toHaveClass('bg-(--color-main-action)', 'h-action', 'w-full');
  });

  it('starts the run at once, with no confirm, and opens the new run', async () => {
    let posted: unknown;
    server.use(
      http.post(`${BASE}/api/runs/:id/rerun`, ({ params }) => {
        posted = params.id;
        return HttpResponse.json(NEW_RUN, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/runs/run2'));
    expect(posted).toBe('run1');
  });

  it("a guest's Re-run dims the screen and sends nothing", async () => {
    mockSignedOut();
    const writes = recordWrites();
    const onError = vi.fn();
    const dimScreen = vi.fn();
    const user = userEvent.setup();
    renderButton(onError, dimScreen);

    await user.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(dimScreen).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(writes).toEqual([]);
  });

  it('a failure hands over the sentence and draws none itself', async () => {
    server.use(
      http.post(`${BASE}/api/runs/:id/rerun`, () =>
        HttpResponse.json({ detail: { code: 'no_cards', message: 'x' } }, { status: 400 }),
      ),
    );
    const onError = vi.fn();
    const user = userEvent.setup();
    renderButton(onError);

    await user.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(NO_CARDS_MESSAGE));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("an active run of the practice reads its sentence, and a new try clears it first", async () => {
    server.use(
      http.post(`${BASE}/api/runs/:id/rerun`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_has_active_run', message: 'x' } },
          { status: 400 },
        ),
      ),
    );
    const onError = vi.fn();
    const user = userEvent.setup();
    renderButton(onError);

    await user.click(screen.getByRole('button', { name: 'Re-run' }));
    await waitFor(() =>
      expect(onError).toHaveBeenLastCalledWith('Finish the active run first.'),
    );

    onError.mockClear();
    await user.click(screen.getByRole('button', { name: 'Re-run' }));
    expect(onError).toHaveBeenNthCalledWith(1, '');
  });
});
