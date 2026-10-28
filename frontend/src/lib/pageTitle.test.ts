// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from 'src/lib/pageTitle';

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = 'Flashy';
  });

  it('sets the title to the name then Flashy', () => {
    renderHook(() => usePageTitle('Verbs'));
    expect(document.title).toBe('Verbs · Flashy');
  });

  it('follows a changed name', () => {
    const { rerender } = renderHook(({ name }) => usePageTitle(name), {
      initialProps: { name: 'Verbs' },
    });
    rerender({ name: 'Nouns' });
    expect(document.title).toBe('Nouns · Flashy');
  });

  it('leaves the title alone while the name is undefined', () => {
    const { rerender } = renderHook(({ name }) => usePageTitle(name), {
      initialProps: { name: undefined as string | undefined },
    });
    expect(document.title).toBe('Flashy');
    rerender({ name: 'Verbs' });
    rerender({ name: undefined });
    expect(document.title).toBe('Verbs · Flashy');
  });

  it('restores Flashy on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Verbs'));
    unmount();
    expect(document.title).toBe('Flashy');
  });
});
