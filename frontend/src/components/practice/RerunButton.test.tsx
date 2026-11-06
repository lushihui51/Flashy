// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import RerunButton from 'src/components/practice/RerunButton';
import { NO_CARDS_MESSAGE } from 'src/lib/practiceCopy';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

const BASE = 'http://localhost:8000';
const SESSION = { id: 'ps1', name: 'Alpha run' };

function LocationProbe() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

function renderButton(look: 'icon' | 'text', onError: (sentence: string) => void = () => {}) {
  return renderWithProviders(
    <>
      <RerunButton session={SESSION} look={look} onError={onError} />
      <LocationProbe />
    </>,
  );
}

async function confirmRerun(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Re-run Alpha run' }));
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Re-run' }));
}

afterEach(() => server.resetHandlers());

describe('RerunButton', () => {
  it('the icon look draws the icon and no word', () => {
    renderButton('icon');

    const button = screen.getByRole('button', { name: 'Re-run Alpha run' });
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button).toHaveTextContent('');
  });

  it('the text look draws the word and no icon', () => {
    renderButton('text');

    const button = screen.getByRole('button', { name: 'Re-run Alpha run' });
    expect(button).toHaveTextContent('Re-run');
    expect(button.querySelector('svg')).not.toBeInTheDocument();
    expect(button).toHaveClass('bg-(--color-surface)', 'h-action');
  });

  it('asks before it posts', async () => {
    let posts = 0;
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/rerun`, () => {
        posts += 1;
        return HttpResponse.json({ id: 'ps2' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderButton('text');

    await user.click(screen.getByRole('button', { name: 'Re-run Alpha run' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Re-run this practice?');
    expect(dialog).toHaveTextContent(
      'A new practice with the same decks is created. This practice and its reviews stay on record.',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(posts).toBe(0);
  });

  it.each(['icon', 'text'] as const)(
    'the %s look posts a generated name and opens the new practice',
    async (look) => {
      const posted: { id: unknown; name?: string }[] = [];
      server.use(
        http.post(`${BASE}/api/practice_runs/:id/rerun`, async ({ params, request }) => {
          const body = (await request.json()) as { name?: string };
          posted.push({ id: params.id, name: body.name });
          return HttpResponse.json({ id: 'ps2' }, { status: 201 });
        }),
      );
      const user = userEvent.setup();
      renderButton(look);

      await confirmRerun(user);

      await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps2'));
      expect(posted).toHaveLength(1);
      expect(posted[0]?.id).toBe('ps1');
      expect(posted[0]?.name).toBeTruthy();
    },
  );

  it('a failure closes the confirm, hands over the sentence and draws none itself', async () => {
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/rerun`, () =>
        HttpResponse.json({ detail: { code: 'no_cards', message: 'developer text' } }, { status: 400 }),
      ),
    );
    const onError = vi.fn();
    const user = userEvent.setup();
    renderButton('text', onError);

    await confirmRerun(user);

    await waitFor(() => expect(onError).toHaveBeenLastCalledWith(NO_CARDS_MESSAGE));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('a new try and a cancel each clear the sentence', async () => {
    const onError = vi.fn();
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/rerun`, () =>
        HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderButton('text', onError);

    await confirmRerun(user);
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith('Practice not found.'));
    expect(onError).toHaveBeenCalledWith('');

    onError.mockClear();
    await user.click(screen.getByRole('button', { name: 'Re-run Alpha run' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(onError).toHaveBeenCalledExactlyOnceWith('');
  });
});
