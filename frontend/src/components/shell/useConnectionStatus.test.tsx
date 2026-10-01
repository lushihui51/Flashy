// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { onlineManager, useQuery } from '@tanstack/react-query';
import { server } from 'src/test/server';
import { renderWithProviders } from 'src/test/testUtils';
import { useConnectionStatus } from 'src/components/shell/useConnectionStatus';

const HEALTH = 'http://localhost:8000/api/health';

function StatusProbe() {
  return <span data-testid="status">{useConnectionStatus()}</span>;
}

async function expectStatus(status: string) {
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent(status));
}

afterEach(() => {
  onlineManager.setOnline(true);
  delete window.Clerk;
});

describe('useConnectionStatus', () => {
  it('is online when health answers 200', async () => {
    let called = false;
    server.use(
      http.get(HEALTH, () => {
        called = true;
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    renderWithProviders(<StatusProbe />);

    await waitFor(() => expect(called).toBe(true));
    await expectStatus('online');
  });

  it('is unreachable when the probe gets no response', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.error()));
    renderWithProviders(<StatusProbe />);

    await expectStatus('unreachable');
  });

  it('is server_trouble on a 503 database_unavailable', async () => {
    server.use(
      http.get(HEALTH, () =>
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
    renderWithProviders(<StatusProbe />);

    await expectStatus('server_trouble');
  });

  it('is server_trouble on an empty-body 502', async () => {
    server.use(http.get(HEALTH, () => new HttpResponse(null, { status: 502 })));
    renderWithProviders(<StatusProbe />);

    await expectStatus('server_trouble');
  });

  it('is server_trouble on a 404 (ADR 062)', async () => {
    server.use(http.get(HEALTH, () => HttpResponse.json({ detail: 'Not Found' }, { status: 404 })));
    renderWithProviders(<StatusProbe />);

    await expectStatus('server_trouble');
  });

  it('is offline when onlineManager reports offline, even with a healthy probe', async () => {
    renderWithProviders(<StatusProbe />);
    await expectStatus('online');

    act(() => onlineManager.setOnline(false));

    await expectStatus('offline');
  });

  it('refetches failed active queries once when the probe recovers, and nothing else', async () => {
    server.use(http.get(HEALTH, () => new HttpResponse(null, { status: 503 })));

    let targetCalls = 0;
    const failsThenSucceeds = vi.fn(async () => {
      targetCalls += 1;
      if (targetCalls === 1) throw new Error('boom');
      return 'loaded';
    });
    const succeeds = vi.fn(async () => 'steady');

    function RecoveryProbe() {
      const target = useQuery({ queryKey: ['target'], queryFn: failsThenSucceeds, retry: false });
      useQuery({ queryKey: ['steady'], queryFn: succeeds });
      return (
        <>
          <StatusProbe />
          <span data-testid="target">{target.status}</span>
        </>
      );
    }

    const { queryClient } = renderWithProviders(<RecoveryProbe />);
    await expectStatus('server_trouble');
    await waitFor(() => expect(screen.getByTestId('target')).toHaveTextContent('error'));

    server.use(http.get(HEALTH, () => HttpResponse.json({ status: 'ok' })));
    await act(() => queryClient.refetchQueries({ queryKey: ['health'] }));

    await expectStatus('online');
    await waitFor(() => expect(screen.getByTestId('target')).toHaveTextContent('success'));
    expect(failsThenSucceeds).toHaveBeenCalledTimes(2);
    expect(succeeds).toHaveBeenCalledTimes(1);
  });

  it('sends the probe without an Authorization header and never asks Clerk for a token', async () => {
    const getToken = vi.fn().mockResolvedValue('t');
    window.Clerk = { session: { getToken } };
    let authorization: string | null = 'unset';
    server.use(
      http.get(HEALTH, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ status: 'ok' });
      }),
    );
    renderWithProviders(<StatusProbe />);

    await waitFor(() => expect(authorization).not.toBe('unset'));
    expect(authorization).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });
});
