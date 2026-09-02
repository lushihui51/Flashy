// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import PracticeRunPage from 'src/pages/PracticeRunPage';

const BASE = 'http://localhost:8000';

function runState(overrides: Record<string, unknown> = {}) {
  return {
    session_name: 'Evening run',
    session_status: 'active',
    progress: { total_cards: 1, unseen: 1, retry_pending: 0, passed: 0, still_failed: 0 },
    current_card: {
      practice_card_id: 'pc1',
      card_id: 'card1',
      attempt: 1,
      prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
      answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
    },
    ...overrides,
  };
}

function mockRun(data: Record<string, unknown> | null = runState()) {
  server.use(
    http.get(`${BASE}/api/practice_sessions/:id/run`, () =>
      data
        ? HttpResponse.json(data)
        : HttpResponse.json({ detail: 'Practice session not found' }, { status: 404 }),
    ),
  );
}

function breakdownState(overrides: Record<string, unknown> = {}) {
  return {
    total_cards: 1,
    passed_first_try: 1,
    passed_after_one_fail: 0,
    passed_after_many_fails: 0,
    still_failed: 0,
    cards: [
      {
        card_id: 'card1',
        bucket: 'passed_first_try',
        attempt_count: 1,
        primary_field: { field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' },
        attempts: [
          {
            practice_card_id: 'pc1',
            status: 'passed',
            created_at: '2026-01-01T00:00:00Z',
            prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
            answers: [
              { field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello', rating: 4 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function mockBreakdown(data: Record<string, unknown> = breakdownState()) {
  server.use(
    http.get(`${BASE}/api/practice_sessions/:id/breakdown`, () => HttpResponse.json(data)),
  );
}

function twoAnswerRunState() {
  return runState({
    current_card: {
      practice_card_id: 'pc1',
      card_id: 'card1',
      attempt: 1,
      prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
      answers: [
        { field_def_id: 'back1', name: 'Back One', type: 'text', value: 'Hello' },
        { field_def_id: 'back2', name: 'Back Two', type: 'text', value: 'World' },
      ],
    },
  });
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderRun(practiceSessionId = 'ps1') {
  return renderWithProviders(
    <Routes>
      <Route path="/practice/:practiceSessionId/run" element={<PracticeRunPage />} />
      <Route path="/practice/:practiceSessionId" element={<LocationProbe />} />
    </Routes>,
    [`/practice/${practiceSessionId}/run`],
  );
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('PracticeRunPage', () => {
  it('renders the prompt fields, labeled with their names', async () => {
    mockRun();
    renderRun();

    expect(await screen.findByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Front')).toBeInTheDocument();
  });

  it('hides answer values until Show answer is tapped, then reveals them labeled', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await screen.findByText('Bonjour');
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show answer' }));

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show answer' })).not.toBeInTheDocument();
  });

  it('renders an image field as a chip and opens its value in an overlay on click', async () => {
    mockRun(
      runState({
        current_card: {
          practice_card_id: 'pc1',
          card_id: 'card1',
          attempt: 1,
          prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
          answers: [
            { field_def_id: 'photo', name: 'Photo', type: 'image', value: 'https://x/img.png' },
          ],
        },
      }),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    const chip = screen.getByRole('button', { name: 'Photo' });
    // Scoped by name: the page's own progress bar also carries role="img" (T7).
    expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();

    await user.click(chip);

    const image = await screen.findByRole('img', { name: 'Photo' });
    expect(image).toHaveAttribute('src', 'https://x/img.png');
  });

  it('shows the session name in the breadcrumb once loaded', async () => {
    mockRun(runState({ session_name: 'Kanji drills' }));
    renderRun();

    expect(await screen.findByRole('link', { name: 'Kanji drills' })).toBeInTheDocument();
  });

  it('shows a breadcrumb back to its own session, for whichever id is in the URL', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun('ps9');

    const crumb = await screen.findByRole('link', { name: 'Evening run' });
    await user.click(crumb);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps9');
  });

  it('shows the completion heading and a Done link once nothing is pending', async () => {
    mockRun(runState({ session_status: 'completed', current_card: null }));
    mockBreakdown();
    const user = userEvent.setup();
    renderRun('ps1');

    expect(await screen.findByRole('heading', { name: 'Practice complete' })).toBeInTheDocument();
    const done = screen.getByRole('link', { name: 'Done' });

    await user.click(done);

    expect(screen.getByTestId('location')).toHaveTextContent('/practice/ps1');
  });

  it('swaps to the completion breakdown (T8) once nothing is pending', async () => {
    mockRun(runState({ session_status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun('ps1');

    expect(await screen.findByRole('tab', { name: 'First try (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Front: Bonjour' })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown or foreign session, without crashing', async () => {
    mockRun(null);
    renderRun('nope');

    expect(await screen.findByText('Practice session not found.')).toBeInTheDocument();
  });
});

describe('PracticeRunPage pre-reveal answer zone (MD-6)', () => {
  it('shows Prompt and Answer zone headers before revealing', async () => {
    mockRun();
    renderRun();

    expect(await screen.findByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Answer' })).toBeInTheDocument();
  });

  it('shows each answer field\'s name with a "Hidden" marker before revealing, its value absent', async () => {
    mockRun();
    renderRun();

    await screen.findByText('Bonjour');
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows no media chip for a hidden image answer field before revealing', async () => {
    mockRun(
      runState({
        current_card: {
          practice_card_id: 'pc1',
          card_id: 'card1',
          attempt: 1,
          prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
          answers: [
            { field_def_id: 'photo', name: 'Photo', type: 'image', value: 'https://x/img.png' },
          ],
        },
      }),
    );
    renderRun();

    await screen.findByText('Bonjour');
    expect(screen.getByText('Photo')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Photo' })).not.toBeInTheDocument();
  });

  it('keeps the zone headers and clears the "Hidden" markers after Show answer', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await screen.findByText('Bonjour');
    await user.click(screen.getByRole('button', { name: 'Show answer' }));

    expect(screen.getByRole('heading', { name: 'Prompt' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Answer' })).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});

describe('PracticeRunPage rating (MD-1, MD-2, MD-4, MD-5)', () => {
  it('tapping a rating chip opens four labeled options', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));

    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
  });

  it('selecting a rating fills the chip with its label', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    expect(screen.queryByRole('button', { name: 'Rate Back' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back: Good' })).toBeInTheDocument();
  });

  it('keeps Next card disabled until every answer field is rated', async () => {
    mockRun(twoAnswerRunState());
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    const next = screen.getByRole('button', { name: 'Next card' });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Rate Back One' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Rate Back Two' }));
    await user.click(screen.getByRole('button', { name: 'Easy' }));
    expect(next).toBeEnabled();
  });

  it('submits the exact ratings map and renders the next card after invalidation', async () => {
    let sentBody: unknown;
    let runCallCount = 0;
    server.use(
      http.get(`${BASE}/api/practice_sessions/:id/run`, () => {
        runCallCount += 1;
        return runCallCount === 1
          ? HttpResponse.json(twoAnswerRunState())
          : HttpResponse.json(
              runState({
                current_card: {
                  practice_card_id: 'pc2',
                  card_id: 'card2',
                  attempt: 1,
                  prompts: [
                    { field_def_id: 'front2', name: 'Front', type: 'text', value: 'Bonsoir' },
                  ],
                  answers: [
                    { field_def_id: 'back3', name: 'Back', type: 'text', value: 'Good evening' },
                  ],
                },
              }),
            );
      }),
      http.post(`${BASE}/api/practice_cards/:id/rate`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          rated_practice_card: {
            id: 'pc1',
            practice_session_id: 'ps1',
            card_id: 'card1',
            position: 0,
            prompts: [],
            answers: [],
            status: 'passed',
            created_at: '2026-01-01T00:00:00Z',
          },
          requeued_practice_card: null,
        });
      }),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back One' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back Two' }));
    await user.click(screen.getByRole('button', { name: 'Easy' }));

    await user.click(screen.getByRole('button', { name: 'Next card' }));

    await waitFor(() => expect(sentBody).toEqual({ ratings: { back1: 3, back2: 4 } }));
    expect(await screen.findByText('Bonsoir')).toBeInTheDocument();
  });

  it('shows the error and keeps the chosen ratings when the submit fails', async () => {
    mockRun();
    server.use(
      http.post(`${BASE}/api/practice_cards/:id/rate`, () =>
        HttpResponse.json({ detail: 'practice_card has already been rated' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    await user.click(screen.getByRole('button', { name: 'Next card' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'practice_card has already been rated',
    );
    expect(screen.getByRole('button', { name: 'Back: Good' })).toBeInTheDocument();
  });
});

describe('PracticeRunPage progress bar and retry badge (ADR 028, MD-3)', () => {
  it('reflects the given counts as proportional segment widths, omitting zero-count segments', async () => {
    mockRun(
      runState({
        progress: { total_cards: 10, unseen: 4, retry_pending: 0, passed: 3, still_failed: 3 },
      }),
    );
    renderRun();

    const bar = await screen.findByRole('img', {
      name: '3 passed, 3 failed, 0 retrying, 4 unseen',
    });
    const segments = Array.from(bar.children) as HTMLElement[];

    // retry_pending is 0, so only three of the four segments render.
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveClass('bg-(--color-success)');
    expect(segments[0]).toHaveStyle({ width: '30%' });
    expect(segments[1]).toHaveClass('bg-(--color-danger)');
    expect(segments[1]).toHaveStyle({ width: '30%' });
    expect(segments[2]).toHaveClass('bg-(--color-pending)');
    expect(segments[2]).toHaveStyle({ width: '40%' });
  });

  it('renders no segments for a session with nothing tallied yet', async () => {
    mockRun(
      runState({
        progress: { total_cards: 5, unseen: 5, retry_pending: 0, passed: 0, still_failed: 0 },
      }),
    );
    renderRun();

    const bar = await screen.findByRole('img', {
      name: '0 passed, 0 failed, 0 retrying, 5 unseen',
    });
    const segments = Array.from(bar.children) as HTMLElement[];

    expect(segments).toHaveLength(1);
    expect(segments[0]).toHaveClass('bg-(--color-pending)');
    expect(segments[0]).toHaveStyle({ width: '100%' });
  });

  it('shows the Retry badge when the current card is a requeued attempt', async () => {
    mockRun(
      runState({
        current_card: {
          practice_card_id: 'pc1',
          card_id: 'card1',
          attempt: 2,
          prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
          answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
        },
      }),
    );
    renderRun();

    expect(await screen.findByText('Retry')).toBeInTheDocument();
  });

  it("does not show the Retry badge on a card's first attempt", async () => {
    mockRun();
    renderRun();

    await screen.findByText('Bonjour');
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});
