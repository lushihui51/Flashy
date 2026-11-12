// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import RunPage from 'src/pages/RunPage';

const BASE = 'http://localhost:8000';

function runState(overrides: Record<string, unknown> = {}) {
  return {
    practice_id: 'practice1',
    practice_name: 'Evening practice',
    day: '2026-11-03',
    day_index: 0,
    status: 'active',
    progress: { total_cards: 1, unseen: 1, retry_pending: 0, passed: 0, still_failed: 0 },
    current_card: {
      run_card_id: 'pc1',
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
    http.get(`${BASE}/api/runs/:id/state`, () =>
      data
        ? HttpResponse.json(data)
        : HttpResponse.json({ detail: 'Run not found' }, { status: 404 }),
    ),
  );
}

function breakdownState(overrides: Record<string, unknown> = {}) {
  return {
    total_cards: 1,
    cards: [
      {
        card_id: 'card1',
        primary_field: { field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' },
        attempts: [
          {
            run_card_id: 'pc1',
            prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value: 'Bonjour' }],
            answers: [
              { field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello', rating: 4 },
            ],
          },
        ],
        readiness: 0.65,
        delta: 0.15,
        change: 'up',
        fields: [
          {
            field_def_id: 'front',
            name: 'Front',
            type: 'text',
            side: 'prompt',
            readiness: 0.6,
            delta: 0.1,
            change: 'up',
          },
          {
            field_def_id: 'back',
            name: 'Back',
            type: 'text',
            side: 'answer',
            readiness: 0.7,
            delta: 0.2,
            change: 'up',
          },
        ],
      },
    ],
    ...overrides,
  };
}

function mockBreakdown(data: Record<string, unknown> = breakdownState()) {
  server.use(http.get(`${BASE}/api/runs/:id/breakdown`, () => HttpResponse.json(data)));
}

function twoAnswerRunState() {
  return runState({
    current_card: {
      run_card_id: 'pc1',
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
  return (
    <span data-testid="location">
      {location.pathname}
      {location.search}
    </span>
  );
}

function renderRun(runId = 'run1', search = '') {
  return renderWithProviders(
    <Routes>
      <Route
        path="/runs/:runId"
        element={
          <>
            <RunPage />
            <LocationProbe />
          </>
        }
      />
      <Route path="/practices/:practiceId" element={<LocationProbe />} />
      <Route path="/practices" element={<LocationProbe />} />
      <Route path="/cards/:cardId/edit" element={<LocationProbe />} />
    </Routes>,
    [`/runs/${runId}${search}`],
  );
}

/** The probe's address split into its path and its search params. */
function probedAddress() {
  const [pathname, search = ''] = screen.getByTestId('location').textContent!.split('?');
  return { pathname, search: new URLSearchParams(search) };
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  server.resetHandlers();
});

describe('RunPage', () => {
  it('renders the prompt fields, labeled with their names', async () => {
    mockRun();
    renderRun();

    expect(await screen.findByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('[Front]')).toBeInTheDocument();
  });

  it.each([
    ['twelve characters or fewer', 'A'.repeat(12), 'text-[3.375rem]'],
    ['longer than twelve characters', 'A'.repeat(13), 'text-value'],
  ])('sizes a prompt value of %s', async (_name, value, sizeClass) => {
    mockRun(
      runState({
        current_card: {
          run_card_id: 'pc1',
          card_id: 'card1',
          attempt: 1,
          prompts: [{ field_def_id: 'front', name: 'Front', type: 'text', value }],
          answers: [{ field_def_id: 'back', name: 'Back', type: 'text', value: 'Hello' }],
        },
      }),
    );
    renderRun();

    expect(await screen.findByText(value)).toHaveClass(sizeClass);
  });

  it('hides answer values until Show answer is tapped, then reveals them labeled', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await screen.findByText('Bonjour');
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show answer' }));

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('[Back]')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show answer' })).not.toBeInTheDocument();
  });

  it('renders an image field as a chip and opens its value in an overlay on click', async () => {
    mockRun(
      runState({
        current_card: {
          run_card_id: 'pc1',
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
    const chip = screen.getByRole('button', { name: '[Photo]' });
    // Scoped by name: the page's own progress bar also carries role="img".
    expect(screen.queryByRole('img', { name: 'Photo' })).not.toBeInTheDocument();

    await user.click(chip);

    expect(await screen.findByRole('dialog', { name: '[Photo]' })).toBeInTheDocument();
    const image = screen.getByRole('img', { name: 'Photo' });
    expect(image).toHaveAttribute('src', 'https://x/img.png');
  });

  it("names the practice in the breadcrumb and the browser tab once loaded", async () => {
    mockRun(runState({ practice_name: 'Kanji drills' }));
    renderRun();

    const row = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(
      await within(row).findByRole('link', { name: 'Practice Kanji drills' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(document.title).toContain('Kanji drills'));
  });

  it("shows All practices above the practice's name, linking to the list of practices", async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    const row = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    const practice = await within(row).findByRole('link', { name: 'Practice Evening practice' });
    const links = within(row).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['All practices', ' Evening practice']);
    expect(row).toHaveTextContent(/^All practices› Evening practice$/);
    // The practice mark leads the practice's name, and All practices carries none.
    expect(practice.firstElementChild).toHaveAttribute('aria-label', 'Practice');
    expect(within(links[0]!).queryByRole('img')).not.toBeInTheDocument();

    await user.click(within(row).getByRole('link', { name: 'All practices' }));

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/practices$/);
  });

  it("links the practice's name to the practice's page", async () => {
    mockRun(runState({ practice_id: 'practice9' }));
    const user = userEvent.setup();
    renderRun('run9');

    await user.click(await screen.findByRole('link', { name: 'Practice Evening practice' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/practices/practice9');
  });

  it('shows the completion heading and a Done link once nothing is pending', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    const user = userEvent.setup();
    renderRun();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Practice complete' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('1 card practiced')).toBeInTheDocument();
    const done = screen.getByRole('link', { name: 'Done' });

    await user.click(done);

    expect(screen.getByTestId('location')).toHaveTextContent('/practices/practice1');
  });

  it('shows Re-run beside a yellow Done, in that order', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun();

    const rerun = await screen.findByRole('button', { name: 'Re-run' });
    const done = screen.getByRole('link', { name: 'Done' });
    expect(rerun).toHaveTextContent('Re-run');
    expect(done.nextElementSibling).toBe(rerun);
    expect(done).toHaveClass('bg-(--color-main-action)', 'flex-1');
  });

  it('turns Done white with a kind in the URL', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun('run1', '?kind=down');

    const done = await screen.findByRole('link', { name: 'Done' });
    expect(done).toHaveClass('bg-(--color-surface)');
    expect(done).not.toHaveClass('bg-(--color-main-action)');
  });

  it('keeps Done yellow with a kind the summary does not know', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun('run1', '?kind=sideways');

    expect(await screen.findByRole('link', { name: 'Done' })).toHaveClass(
      'bg-(--color-main-action)',
    );
  });

  it('a re-run that fails says why under the row', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    server.use(
      http.post(`${BASE}/api/runs/:id/rerun`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_has_active_run', message: 'developer text' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Re-run' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Finish the active run first.');
    expect(alert).toHaveClass('text-(--color-wrong)');
    expect(alert.previousElementSibling).toContainElement(
      screen.getByRole('link', { name: 'Done' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a re-run starts at once, with no confirm, and lands on the new run', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    server.use(
      http.post(`${BASE}/api/runs/:id/rerun`, () =>
        HttpResponse.json(
          {
            id: 'run2',
            practice_id: 'practice1',
            status: 'active',
            day: '2026-11-03',
            day_index: 1,
            created_at: '2026-11-03T18:00:00Z',
            last_activity_at: '2026-11-03T18:00:00Z',
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Re-run' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/runs/run2'));
  });

  it('swaps to the summary once nothing is pending', async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun();

    expect(await screen.findByText('1 card practiced')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bonjour/ })).toBeInTheDocument();
  });

  it('shows "not found" for an unknown or foreign run, without crashing', async () => {
    mockRun(null);
    renderRun('nope');

    expect(await screen.findByText('Run not found.')).toBeInTheDocument();
    const row = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(row).getByRole('link', { name: 'All practices' })).toHaveAttribute(
      'href',
      '/practices',
    );
  });

  it('a load failure other than 404 says it could not load, not that it was not found', async () => {
    server.use(
      http.get(`${BASE}/api/runs/:id/state`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );
    renderRun();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this run.');
    expect(screen.queryByText('Run not found.')).not.toBeInTheDocument();
  });
});

describe('RunPage pre-reveal answer zone (MD-6)', () => {
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
    expect(screen.getByText('[Back]')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('shows no media chip for a hidden image answer field before revealing', async () => {
    mockRun(
      runState({
        current_card: {
          run_card_id: 'pc1',
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
    expect(screen.getByText('[Photo]')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '[Photo]' })).not.toBeInTheDocument();
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

describe('RunPage rating (MD-1, MD-2, MD-4, MD-5)', () => {
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
      http.get(`${BASE}/api/runs/:id/state`, () => {
        runCallCount += 1;
        return runCallCount === 1
          ? HttpResponse.json(twoAnswerRunState())
          : HttpResponse.json(
              runState({
                current_card: {
                  run_card_id: 'pc2',
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
      http.post(`${BASE}/api/run_cards/:id/rate`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({
          rated_run_card: {
            id: 'pc1',
            run_id: 'run1',
            card_id: 'card1',
            position: 0,
            prompts: [],
            answers: [],
            status: 'passed',
            created_at: '2026-01-01T00:00:00Z',
          },
          requeued_run_card: null,
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

  it('shows the sentence and keeps the chosen ratings when the submit fails', async () => {
    mockRun();
    server.use(
      http.post(`${BASE}/api/run_cards/:id/rate`, () =>
        HttpResponse.json(
          {
            detail: {
              code: 'card_already_rated',
              message: 'run_card is no longer pending',
            },
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    await user.click(screen.getByRole('button', { name: 'Next card' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This card has already been rated.');
    expect(screen.getByRole('button', { name: 'Back: Good' })).toBeInTheDocument();
  });
});

describe('RunPage Edit card and the place on the card in the URL', () => {
  it('Edit card reads not ready beside Show answer, and a click navigates nowhere', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    const showAnswer = await screen.findByRole('button', { name: 'Show answer' });
    const edit = screen.getByRole('button', { name: 'Edit card' });
    expect(edit).toHaveAttribute('aria-disabled', 'true');
    expect(edit.nextElementSibling).toBe(showAnswer);

    await user.click(edit);

    expect(screen.getByTestId('location')).toHaveTextContent(/^\/runs\/run1$/);
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it("after Show answer, Edit card opens the card's form with both addresses the run page's full address", async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    const edit = screen.getByRole('button', { name: 'Edit card' });
    expect(edit).not.toHaveAttribute('aria-disabled');
    expect(edit.nextElementSibling).toBe(screen.getByRole('button', { name: 'Next card' }));

    await user.click(edit);

    const { pathname, search } = probedAddress();
    expect(pathname).toBe('/cards/card1/edit');
    expect(search.get('cancelTo')).toBe('/runs/run1?card=pc1&shown=1&rating.back=3');
    expect(search.get('returnTo')).toBe('/runs/run1?card=pc1&shown=1&rating.back=3');
  });

  it('Show answer writes shown=1 and the run card', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      /^\/runs\/run1\?card=pc1&shown=1$/,
    );
  });

  it('a rating writes rating.<fieldId>', async () => {
    mockRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      /^\/runs\/run1\?card=pc1&shown=1&rating\.back=3$/,
    );
  });

  it('mounting with card, shown and a rating in the URL renders the answers shown and the chip rated', async () => {
    mockRun();
    renderRun('run1', '?card=pc1&shown=1&rating.back=3');

    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back: Good' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next card' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Show answer' })).not.toBeInTheDocument();
  });

  it("mounting with another card's card renders the answers hidden", async () => {
    mockRun();
    renderRun('run1', '?card=pc0&shown=1&rating.back=3');

    expect(await screen.findByText('Hidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show answer' })).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('a successful Next card leaves none of card, shown and rating in the URL', async () => {
    let runCallCount = 0;
    server.use(
      http.get(`${BASE}/api/runs/:id/state`, () => {
        runCallCount += 1;
        return runCallCount === 1
          ? HttpResponse.json(runState())
          : HttpResponse.json(
              runState({
                current_card: {
                  run_card_id: 'pc2',
                  card_id: 'card2',
                  attempt: 1,
                  prompts: [
                    { field_def_id: 'front2', name: 'Front', type: 'text', value: 'Bonsoir' },
                  ],
                  answers: [
                    { field_def_id: 'back', name: 'Back', type: 'text', value: 'Good evening' },
                  ],
                },
              }),
            );
      }),
      http.post(`${BASE}/api/run_cards/:id/rate`, () =>
        HttpResponse.json({
          rated_run_card: {
            id: 'pc1',
            run_id: 'run1',
            card_id: 'card1',
            position: 0,
            prompts: [],
            answers: [],
            status: 'passed',
            created_at: '2026-01-01T00:00:00Z',
          },
          requeued_run_card: null,
        }),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'Show answer' }));
    await user.click(screen.getByRole('button', { name: 'Rate Back' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));
    await user.click(screen.getByRole('button', { name: 'Next card' }));

    expect(await screen.findByText('Bonsoir')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/runs\/run1$/),
    );
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show answer' })).toBeInTheDocument();
    expect(screen.queryByText('Good evening')).not.toBeInTheDocument();
  });
});

describe('RunPage progress bar and retry badge (MD-3)', () => {
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
    expect(segments[0]).toHaveClass('bg-(--color-ink)');
    expect(segments[0]).toHaveStyle({ width: '30%' });
    expect(segments[1]).toHaveClass('bg-(--color-wrong)');
    expect(segments[1]).toHaveStyle({ width: '30%' });
    expect(segments[2]).toHaveClass('bg-(--color-line)');
    expect(segments[2]).toHaveStyle({ width: '40%' });
  });

  it('renders no segments for a run with nothing tallied yet', async () => {
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
    expect(segments[0]).toHaveClass('bg-(--color-line)');
    expect(segments[0]).toHaveStyle({ width: '100%' });
  });

  it('shows the Retry badge when the current card is a requeued attempt', async () => {
    mockRun(
      runState({
        current_card: {
          run_card_id: 'pc1',
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

describe('RunPage End run', () => {
  /** The run active until the end POST arrives, completed from then on; returns the POSTs. */
  function mockEndableRun() {
    const ends: string[] = [];
    let ended = false;
    server.use(
      http.get(`${BASE}/api/runs/:id/state`, () =>
        HttpResponse.json(
          ended ? runState({ status: 'completed', current_card: null }) : runState(),
        ),
      ),
      http.post(`${BASE}/api/runs/:id/end`, ({ params }) => {
        ends.push(params.id as string);
        ended = true;
        return HttpResponse.json({
          id: params.id,
          practice_id: 'practice1',
          status: 'completed',
          day: '2026-11-03',
          day_index: 0,
          created_at: '2026-11-03T18:00:00Z',
          last_activity_at: '2026-11-03T18:05:00Z',
        });
      }),
    );
    mockBreakdown();
    return ends;
  }

  it('stands at the right end of the progress bar\'s line, as a white button', async () => {
    mockRun();
    renderRun();

    const endRun = await screen.findByRole('button', { name: 'End run' });
    const bar = screen.getByRole('img', { name: '0 passed, 0 failed, 0 retrying, 1 unseen' });
    expect(endRun.previousElementSibling).toContainElement(bar);
    expect(endRun.nextElementSibling).toBeNull();
    expect(endRun).toHaveClass('bg-(--color-surface)');
  });

  it('asks first, sending nothing until the user says yes', async () => {
    const ends = mockEndableRun();
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'End run' }));

    const dialog = screen.getByRole('dialog', { name: 'End this run?' });
    expect(dialog).toHaveTextContent(
      'The cards you have not reached stay as they are. The run shows only the cards you did.',
    );
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'End run' })).toBeInTheDocument();
    expect(ends).toEqual([]);
  });

  it('Cancel closes the confirm and changes nothing', async () => {
    const ends = mockEndableRun();
    const user = userEvent.setup();
    renderRun('run1', '?card=pc1&shown=1');

    await user.click(await screen.findByRole('button', { name: 'End run' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(ends).toEqual([]);
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(probedAddress().search.get('shown')).toBe('1');
  });

  it("yes ends the run once and turns the page into the completed run's, at the same address", async () => {
    const ends = mockEndableRun();
    const user = userEvent.setup();
    renderRun('run1', '?card=pc1&shown=1');

    await user.click(await screen.findByRole('button', { name: 'End run' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End run' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Practice complete' }),
    ).toBeInTheDocument();
    expect(ends).toEqual(['run1']);
    expect(screen.queryByRole('button', { name: 'End run' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /unseen/ })).not.toBeInTheDocument();
    await waitFor(() => expect(probedAddress().search.has('card')).toBe(false));
    expect(probedAddress().pathname).toBe('/runs/run1');
    expect(probedAddress().search.has('shown')).toBe(false);
  });

  it('a failed end says why beside End run, and the card stays', async () => {
    mockRun();
    server.use(
      http.post(`${BASE}/api/runs/:id/end`, () =>
        HttpResponse.json({ detail: 'run run1 not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderRun();

    await user.click(await screen.findByRole('button', { name: 'End run' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'End run' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Run not found.');
    expect(alert.previousElementSibling).toContainElement(
      screen.getByRole('button', { name: 'End run' }),
    );
    expect(screen.getByText('Bonjour')).toBeInTheDocument();
  });

  it("a completed run's page shows neither End run nor the progress bar", async () => {
    mockRun(runState({ status: 'completed', current_card: null }));
    mockBreakdown();
    renderRun();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Practice complete' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'End run' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /unseen/ })).not.toBeInTheDocument();
  });
});
