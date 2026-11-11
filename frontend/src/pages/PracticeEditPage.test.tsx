// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import PracticeEditPage from 'src/pages/PracticeEditPage';
import type { components } from 'src/api/types';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';

// Every call the form makes to leave, passed on to the real leave, which under a memory
// router replaces the form's entry.
const leaveCalls = vi.hoisted(() => vi.fn());
vi.mock('src/lib/leaveForm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/lib/leaveForm')>();
  return {
    useLeaveForm: () => {
      const leave = actual.useLeaveForm();
      return (...args: Parameters<typeof leave>) => {
        leaveCalls(...args);
        return leave(...args);
      };
    },
  };
});

const BASE = 'http://localhost:8000';

const PRACTICE: components['schemas']['PracticeDetail'] = {
  id: 'p1',
  name: 'Ports before the exam',
  created_at: '2026-11-03T18:00:00Z',
  decks: [{ deck_id: 'd1', deck_name: 'Ports' }],
  active_run_id: null,
  readiness: null,
  runs: [],
};

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderEdit(entry = '/practices/p1/edit') {
  server.use(http.get(`${BASE}/api/practices/:practice_id`, () => HttpResponse.json(PRACTICE)));
  return renderWithProviders(
    <Routes>
      <Route path="/practices/:practiceId/edit" element={<PracticeEditPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    [entry],
  );
}

const nameInput = () => screen.getByRole('textbox', { name: 'Name' });

beforeEach(() => leaveCalls.mockClear());

describe('PracticeEditPage', () => {
  it("reads its heading, Name holding the practice's name, Delete practice, then Cancel and Save", async () => {
    renderEdit();

    expect(await screen.findByRole('heading', { level: 1, name: 'Edit practice' })).toBeVisible();
    expect(nameInput()).toHaveValue('Ports before the exam');
    expect(screen.getByRole('button', { name: 'Delete practice' })).toBeVisible();
    const bar = screen.getByTestId('form-bar');
    expect(
      within(bar)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Cancel', 'Save']);
    expect(document.title).toBe('Edit practice · Flashy');
  });

  it("Save sends the name and lands on the practice's page, else returnTo", async () => {
    let body: unknown;
    server.use(
      http.patch(`${BASE}/api/practices/:practice_id`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PRACTICE, name: 'Evening' });
      }),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.clear(await screen.findByRole('textbox', { name: 'Name' }));
    await user.type(nameInput(), ' Evening ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices/p1'));
    expect(body).toEqual({ name: 'Evening' });
  });

  it('Save lands on returnTo when given', async () => {
    server.use(http.patch(`${BASE}/api/practices/:practice_id`, () => HttpResponse.json(PRACTICE)));
    const user = userEvent.setup();
    renderEdit('/practices/p1/edit?returnTo=%2Fpractices');

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices'));
  });

  it('a blank Name is said beside Name, Save is not ready, and nothing is sent', async () => {
    let patches = 0;
    server.use(
      http.patch(`${BASE}/api/practices/:practice_id`, () => {
        patches += 1;
        return HttpResponse.json(PRACTICE);
      }),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.clear(await screen.findByRole('textbox', { name: 'Name' }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await user.click(save);

    const sentence = await screen.findByText('Name is required.');
    expect(sentence).toHaveAttribute('role', 'alert');
    expect(sentence.closest('[data-reveal-part]')).toContainElement(nameInput());
    expect(patches).toBe(0);
  });

  it('a taken name is said beside Name, not in the bar, and goes when Name changes', async () => {
    server.use(
      http.patch(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json(
          { detail: { code: 'practice_name_taken', message: 'x' } },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Save' }));

    const sentence = await screen.findByText('A practice with this name already exists.');
    expect(sentence).toHaveAttribute('role', 'alert');
    expect(sentence.closest('[data-reveal-part]')).toContainElement(nameInput());
    expect(within(screen.getByTestId('form-bar')).queryByRole('alert')).not.toBeInTheDocument();
    expect(leaveCalls).not.toHaveBeenCalled();

    await user.type(nameInput(), '2');
    expect(screen.queryByText('A practice with this name already exists.')).not.toBeInTheDocument();
  });

  it("Cancel leaves for cancelTo, else the practice's page, asking nothing", async () => {
    const user = userEvent.setup();
    renderEdit('/practices/p1/edit?cancelTo=%2F');
    await user.type(await screen.findByRole('textbox', { name: 'Name' }), ' changed');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(leaveCalls).toHaveBeenLastCalledWith('/');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("Cancel with no cancelTo leaves for the practice's page", async () => {
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(leaveCalls).toHaveBeenCalledWith('/practices/p1');
  });

  it('Delete practice asks first, and Delete deletes it and lands on All practices', async () => {
    let deleted: unknown;
    server.use(
      http.delete(`${BASE}/api/practices/:practice_id`, ({ params }) => {
        deleted = params.practice_id;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Delete practice' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this practice?' });
    expect(dialog).toHaveTextContent(
      'Its runs will be gone. Its decks and your mastery stay as they are.',
    );
    expect(deleted).toBeUndefined();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(leaveCalls).toHaveBeenCalledWith('/practices'));
    expect(deleted).toBe('p1');
  });

  it("the confirm's Cancel deletes nothing", async () => {
    let deletes = 0;
    server.use(
      http.delete(`${BASE}/api/practices/:practice_id`, () => {
        deletes += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Delete practice' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this practice?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deletes).toBe(0);
    expect(leaveCalls).not.toHaveBeenCalled();
  });

  it('a refused delete reads its sentence in the bar', async () => {
    server.use(
      http.delete(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderEdit();

    await user.click(await screen.findByRole('button', { name: 'Delete practice' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    const bar = screen.getByTestId('form-bar');
    expect(await within(bar).findByRole('alert')).toHaveTextContent('Practice not found.');
    expect(leaveCalls).not.toHaveBeenCalled();
  });

  it('an unknown practice reads "Practice not found."', async () => {
    server.use(
      http.get(`${BASE}/api/practices/:practice_id`, () =>
        HttpResponse.json({ detail: 'Practice not found' }, { status: 404 }),
      ),
    );
    renderWithProviders(
      <Routes>
        <Route path="/practices/:practiceId/edit" element={<PracticeEditPage />} />
      </Routes>,
      ['/practices/p1/edit'],
    );

    expect(await screen.findByText('Practice not found.')).toBeVisible();
  });
});
