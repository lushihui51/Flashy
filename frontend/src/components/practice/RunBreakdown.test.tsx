// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import RunBreakdown from 'src/components/practice/RunBreakdown';
import { NO_CARDS_MESSAGE, NOTHING_TO_PRACTICE_MESSAGE } from 'src/lib/practiceCopy';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import type { components } from 'src/api/types';

type PracticeRunBreakdown = components['schemas']['PracticeRunBreakdown'];
type BreakdownCard = components['schemas']['BreakdownCard'];

function card(
  id: string,
  name: string,
  readiness: number,
  delta: number,
  change: BreakdownCard['change'],
): BreakdownCard {
  return {
    card_id: id,
    primary_field: { field_def_id: `front-${id}`, name: 'Front', type: 'text', value: name },
    readiness,
    delta,
    change,
    fields: [],
    attempts: [],
  };
}

// Readiness and delta order the cards differently, and every kind but up a lot has a card.
function breakdown(): PracticeRunBreakdown {
  return {
    total_cards: 5,
    cards: [
      card('c1', 'Bonjour', 0.7, 0.2, 'up'),
      card('c2', 'Bonsoir', 0.2, -0.3, 'down_a_lot'),
      card('c3', '', 0.5, 0, 'no_change'),
      card('c4', 'Adieu', 0.6, -0.1, 'down'),
      card('c5', 'Salut', 0.9, 0.2, 'up'),
    ],
  };
}

// Two attempts: the second leaves OS unshown and retries Meaning; Example is rated only the first
// time; Filler is listed but no attempt names it.
function retriedCard(): BreakdownCard {
  const field = (id: string, name: string, side: 'prompt' | 'answer') => ({
    field_def_id: id,
    name,
    type: 'text' as const,
    side,
    readiness: 0.5,
    delta: 0.1,
    change: 'up' as const,
  });
  const value = (id: string, name: string, text: string) => ({
    field_def_id: id,
    name,
    type: 'text' as const,
    value: text,
  });
  return {
    ...card('c9', 'chmod', 0.58, -0.2, 'down'),
    fields: [
      field('front', 'Command', 'prompt'),
      field('os', 'OS', 'prompt'),
      field('meaning', 'Meaning', 'answer'),
      field('example', 'Example', 'answer'),
      field('filler', 'Filler', 'answer'),
    ],
    attempts: [
      {
        practice_card_id: 'a1',
        prompts: [value('front', 'Command', 'chmod'), value('os', 'OS', 'Linux')],
        answers: [
          { ...value('meaning', 'Meaning', 'Change permissions'), rating: 1 },
          { ...value('example', 'Example', 'chmod +x'), rating: 4 },
        ],
      },
      {
        practice_card_id: 'a2',
        prompts: [value('front', 'Command', 'chmod')],
        answers: [{ ...value('meaning', 'Meaning', 'Change permissions'), rating: 3 }],
      },
    ],
  };
}

function LocationProbe() {
  const { pathname, search } = useLocation();
  return (
    <>
      <div data-testid="pathname">{pathname}</div>
      <div data-testid="search">{search}</div>
    </>
  );
}

function renderBreakdown(entry = '/') {
  return renderWithProviders(
    <>
      <RunBreakdown breakdown={breakdown()} practiceSessionId="ps1" />
      <LocationProbe />
    </>,
    [entry],
  );
}

function renderSheet(entry = '/?card=c9') {
  return renderWithProviders(
    <>
      <RunBreakdown breakdown={{ total_cards: 1, cards: [retriedCard()] }} practiceSessionId="ps1" />
      <LocationProbe />
    </>,
    [entry],
  );
}

// Each mark in `marks`, as its circles' radius, fill and stroke.
function drawnMarks(marks: Element) {
  return Array.from(marks.querySelectorAll('svg')).map((mark) =>
    Array.from(mark.querySelectorAll('circle')).map((circle) => ({
      r: circle.getAttribute('r'),
      fill: circle.getAttribute('fill'),
      stroke: circle.getAttribute('stroke'),
    })),
  );
}

function rowNames() {
  return within(screen.getByRole('list'))
    .queryAllByRole('button')
    .map((row) => row.textContent);
}

describe('RunBreakdown', () => {
  it('orders by readiness ascending by default, with Mastery pressed in', () => {
    renderBreakdown();

    expect(screen.getByRole('radiogroup', { name: 'Order by' })).toHaveTextContent('Order by:');
    expect(screen.getByRole('radio', { name: 'Mastery' })).toHaveAttribute('aria-checked', 'true');
    expect(rowNames()).toEqual(['Bonsoir', 'Untitled card', 'Adieu', 'Bonjour', 'Salut']);
  });

  it('Gains orders by delta descending, ties keeping the payload order', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Gains' }));

    expect(rowNames()).toEqual(['Bonjour', 'Salut', 'Untitled card', 'Adieu', 'Bonsoir']);
    expect(screen.getByRole('radio', { name: 'Gains' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Drops orders by delta ascending', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Drops' }));

    expect(rowNames()).toEqual(['Bonsoir', 'Adieu', 'Untitled card', 'Bonjour', 'Salut']);
  });

  it('choosing an order writes it to the URL, and Mastery removes it', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('radio', { name: 'Drops' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?order=drops');

    await user.click(screen.getByRole('radio', { name: 'Mastery' }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('the five counts speak their count and word in order, and show the number', () => {
    renderBreakdown();

    const counts = within(screen.getByRole('group')).getAllByRole('button');
    expect(counts.map((count) => count.getAttribute('aria-label'))).toEqual([
      '0 up a lot',
      '2 up',
      '1 no change',
      '1 down',
      '1 down a lot',
    ]);
    expect(counts.map((count) => count.textContent)).toEqual(['0', '2', '1', '1', '1']);
    expect(counts.every((count) => count.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(counts.every((count) => count.querySelector('svg'))).toBe(true);
  });

  it('choosing two counts narrows to their cards, writes kind twice, and leaves the counts', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('button', { name: '1 down' }));
    await user.click(screen.getByRole('button', { name: '1 down a lot' }));

    expect(rowNames()).toEqual(['Bonsoir', 'Adieu']);
    expect(screen.getByTestId('search')).toHaveTextContent('?kind=down&kind=down_a_lot');
    expect(screen.getByRole('button', { name: '1 down' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2 up' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tapping a chosen count again shows every card', async () => {
    const user = userEvent.setup();
    renderBreakdown('/?kind=down');

    await user.click(screen.getByRole('button', { name: '1 down' }));

    expect(rowNames()).toHaveLength(5);
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('a count of zero stays pressable and narrows to an empty list with no sentence', async () => {
    const user = userEvent.setup();
    renderBreakdown();

    await user.click(screen.getByRole('button', { name: '0 up a lot' }));

    expect(screen.getByRole('button', { name: '0 up a lot' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const list = screen.getByRole('list');
    expect(list).toBeEmptyDOMElement();
    expect(list.parentElement!.lastElementChild).toBe(list);
  });

  it('a kind in the URL on first render already narrows', () => {
    renderBreakdown('/?kind=up');

    expect(rowNames()).toEqual(['Bonjour', 'Salut']);
    expect(screen.getByRole('button', { name: '2 up' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a kind or order the lists do not hold reads as absent', () => {
    renderBreakdown('/?kind=sideways&order=loudest');

    expect(rowNames()).toEqual(['Bonsoir', 'Untitled card', 'Adieu', 'Bonjour', 'Salut']);
    expect(screen.getByRole('radio', { name: 'Mastery' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a row speaks its mastery and change, and shows no number or outcome', () => {
    renderBreakdown();

    const row = screen.getByRole('button', { name: /Bonsoir/ });
    expect(within(row).getByRole('img', { name: 'Mastery 20%, down a lot' })).toBeInTheDocument();
    expect(row.textContent).toBe('Bonsoir');

    const words = within(screen.getByRole('list')).getByText('Bonjour').closest('ul')!.textContent!;
    for (const forbidden of ['+', '−', '±', 'First try', 'Attempt']) {
      expect(words).not.toContain(forbidden);
    }
  });

  it('a card whose first field is blank reads "Untitled card"', () => {
    renderBreakdown();

    expect(screen.getByRole('button', { name: /Untitled card/ })).toBeInTheDocument();
  });

  describe('a card opened from the summary', () => {
    it('tapping a row writes card to the URL and opens the sheet with its name and spoken circle', async () => {
      const user = userEvent.setup();
      renderSheet('/?order=gains');

      await user.click(screen.getByRole('button', { name: /chmod/ }));

      expect(screen.getByTestId('search')).toHaveTextContent('?order=gains&card=c9');
      const sheet = screen.getByRole('dialog', { name: 'chmod' });
      expect(within(sheet).getByRole('heading', { level: 2, name: 'chmod' })).toBeInTheDocument();
      expect(within(sheet).getByRole('img', { name: 'Mastery 58%, down' })).toBeInTheDocument();
    });

    it('a card in the URL on first render opens it', () => {
      renderSheet();

      expect(screen.getByRole('dialog', { name: 'chmod' })).toBeInTheDocument();
    });

    it('a card the payload does not hold leaves the sheet closed', () => {
      renderSheet('/?card=gone');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closing removes card and keeps the other params', async () => {
      const user = userEvent.setup();
      renderSheet('/?order=drops&card=c9');

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('search')).toHaveTextContent('?order=drops');
    });

    it('lists each field under its side in the payload order, each with its value and circle', () => {
      renderSheet();

      const sheet = within(screen.getByRole('dialog', { name: 'chmod' }));
      expect(sheet.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'Prompt',
        'Answer',
      ]);
      const answerHeading = sheet.getByRole('heading', { level: 3, name: 'Answer' });
      const os = sheet.getByText('OS');
      expect(
        os.compareDocumentPosition(answerHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(sheet.getByText('Linux')).toBeInTheDocument();
      expect(sheet.getByText('Change permissions')).toBeInTheDocument();
      expect(sheet.getAllByRole('img', { name: 'Mastery 50%, up' })).toHaveLength(4);
    });

    it('a prompt field speaks and draws one mark per attempt', () => {
      renderSheet();

      const marks = screen.getByRole('img', { name: 'OS: shown, then not shown' });
      expect(drawnMarks(marks)).toEqual([
        [{ r: '6.5', fill: 'var(--color-ink)', stroke: null }],
        [{ r: '5.75', fill: 'none', stroke: 'var(--color-line)' }],
      ]);
    });

    it('an answer field speaks and draws each rating, Again then Good', () => {
      renderSheet();

      const marks = screen.getByRole('img', { name: 'Meaning: Again, then Good' });
      expect(drawnMarks(marks)).toEqual([
        [{ r: '6.5', fill: 'var(--color-wrong)', stroke: null }],
        [
          { r: '5.75', fill: 'none', stroke: 'var(--color-ink)' },
          { r: '3.25', fill: 'var(--color-ink)', stroke: null },
        ],
      ]);
    });

    it('an attempt that did not ask an answer field speaks "not asked"', () => {
      renderSheet();

      expect(screen.getByRole('img', { name: 'Example: Easy, then not asked' })).toBeInTheDocument();
    });

    it('a field no attempt names is absent', () => {
      renderSheet();

      expect(screen.queryByText('Filler')).not.toBeInTheDocument();
    });

    it('says nothing of how many attempts there were or which passed', () => {
      renderSheet();

      const words = screen.getByRole('dialog', { name: 'chmod' }).textContent!;
      for (const forbidden of ['Attempt', 'Passed', 'Failed', 'First try']) {
        expect(words).not.toContain(forbidden);
      }
    });

    it('the "i" opens the key, which names the seven marks, and a tap on the layer closes it', async () => {
      const user = userEvent.setup();
      renderSheet();
      expect(screen.queryByRole('dialog', { name: 'Key' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Key' }));

      expect(screen.getByRole('button', { name: 'Key' })).toHaveAttribute('aria-expanded', 'true');
      const key = within(screen.getByRole('dialog', { name: 'Key' }));
      for (const word of ['shown', 'not shown', 'Again', 'Hard', 'Good', 'Easy', 'not asked']) {
        expect(key.getByText(word).previousElementSibling?.tagName.toLowerCase()).toBe('svg');
      }
      expect(key.getByText('Prompt')).toBeInTheDocument();
      expect(key.getByText('Answer')).toBeInTheDocument();

      await user.click(screen.getByTestId('key-layer'));

      expect(screen.queryByRole('dialog', { name: 'Key' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'chmod' })).toBeInTheDocument();
    });

    it('a second tap on the "i" closes the key', async () => {
      const user = userEvent.setup();
      renderSheet();

      await user.click(screen.getByRole('button', { name: 'Key' }));
      await user.click(screen.getByRole('button', { name: 'Key' }));

      expect(screen.queryByRole('dialog', { name: 'Key' })).not.toBeInTheDocument();
    });

    it('shows "Edit card" with a pencil under the record card', () => {
      renderSheet();

      const sheet = within(screen.getByRole('dialog', { name: 'chmod' }));
      const edit = sheet.getByRole('button', { name: 'Edit card' });
      expect(edit.querySelector('svg')).not.toBeNull();
      expect(edit).toHaveClass('tappable-sm', 'rounded-full', 'self-start');
      const answerHeading = sheet.getByRole('heading', { level: 3, name: 'Answer' });
      expect(answerHeading.compareDocumentPosition(edit)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it("Edit card opens the card's form with both addresses the page's full address", async () => {
      const user = userEvent.setup();
      renderSheet('/practice/ps1?kind=down&kind=up&order=gains&card=c9');

      await user.click(screen.getByRole('button', { name: 'Edit card' }));

      expect(screen.getByTestId('pathname')).toHaveTextContent(/^\/cards\/c9\/edit$/);
      const search = new URLSearchParams(screen.getByTestId('search').textContent!);
      expect(search.get('cancelTo')).toBe('/practice/ps1?kind=down&kind=up&order=gains&card=c9');
      expect(search.get('returnTo')).toBe('/practice/ps1?kind=down&kind=up&order=gains&card=c9');
    });
  });
});

describe('RunBreakdown Practice these', () => {
  const BASE = 'http://localhost:8000';
  const practiceThese = () => screen.queryByRole('button', { name: 'Practice these' });

  function refuseWith(status: number, detail: unknown) {
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/chosen_cards`, () =>
        HttpResponse.json({ detail }, { status }),
      ),
    );
  }

  afterEach(() => server.resetHandlers());

  it('is absent with no count chosen', () => {
    renderBreakdown();

    expect(practiceThese()).not.toBeInTheDocument();
  });

  it('is absent with a count of zero alone chosen', () => {
    renderBreakdown('/?kind=up_a_lot');

    expect(practiceThese()).not.toBeInTheDocument();
  });

  it('sits under the counts and above the order once a chosen count lists a card', () => {
    renderBreakdown('/?kind=down');

    const button = practiceThese()!;
    expect(button).toHaveClass('w-full', 'bg-(--color-main-action)');
    const counts = screen.getByRole('button', { name: '1 down' }).closest('[role="group"]')!;
    const order = screen.getByRole('radiogroup', { name: 'Order by' });
    expect(counts.compareDocumentPosition(button)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(button.compareDocumentPosition(order)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('posts the name and the ids of the narrowed list, then opens the new practice', async () => {
    const posted: { id: unknown; body: { name?: string; card_ids?: string[] } }[] = [];
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/chosen_cards`, async ({ params, request }) => {
        posted.push({
          id: params.id,
          body: (await request.json()) as { name?: string; card_ids?: string[] },
        });
        return HttpResponse.json({ id: 'ps2' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderBreakdown('/?kind=down&kind=down_a_lot');

    await user.click(practiceThese()!);

    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/practice/ps2'));
    expect(posted).toHaveLength(1);
    expect(posted[0]?.id).toBe('ps1');
    expect(posted[0]?.body.name).toBeTruthy();
    expect(posted[0]?.body.card_ids?.toSorted()).toEqual(['c2', 'c4']);
  });

  it.each([
    ['nothing_to_practice', 400, { code: 'nothing_to_practice', message: 'x' }, NOTHING_TO_PRACTICE_MESSAGE],
    ['no_cards', 400, { code: 'no_cards', message: 'x' }, NO_CARDS_MESSAGE],
    ['a practice gone', 404, 'Practice not found', 'Practice not found.'],
  ])('%s reads its sentence under the button, with the list as it was', async (_name, status, detail, sentence) => {
    refuseWith(status, detail);
    const user = userEvent.setup();
    renderBreakdown('/?kind=down&order=drops');
    const before = rowNames();

    await user.click(practiceThese()!);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(sentence);
    expect(alert).toHaveClass('text-sm', 'text-(--color-wrong)');
    expect(practiceThese()!.compareDocumentPosition(alert)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rowNames()).toEqual(before);
    expect(screen.getByTestId('pathname')).toHaveTextContent('/');
    expect(screen.getByTestId('search')).toHaveTextContent('?kind=down&order=drops');
  });

  it('the sentence clears on the next tap of Practice these', async () => {
    refuseWith(400, { code: 'no_cards', message: 'x' });
    const user = userEvent.setup();
    renderBreakdown('/?kind=down');

    await user.click(practiceThese()!);
    await screen.findByRole('alert');

    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${BASE}/api/practice_runs/:id/chosen_cards`, async () => {
        await held;
        return HttpResponse.json({ id: 'ps2' }, { status: 201 });
      }),
    );
    await user.click(practiceThese()!);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    release();
    await waitFor(() => expect(screen.getByTestId('pathname')).toHaveTextContent('/practice/ps2'));
  });

  it('the sentence clears on the next tap of a count', async () => {
    refuseWith(400, { code: 'no_cards', message: 'x' });
    const user = userEvent.setup();
    renderBreakdown('/?kind=down');

    await user.click(practiceThese()!);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: '2 up' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(practiceThese()).toBeInTheDocument();
  });
});
