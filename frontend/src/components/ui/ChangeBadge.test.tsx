// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ChangeBadge from 'src/components/ui/ChangeBadge';
import type { ChangeKind } from 'src/lib/changeKinds';

function chevronCount(path: Element): number {
  return path.getAttribute('d')!.match(/M/g)!.length;
}

describe('ChangeBadge', () => {
  it.each<[ChangeKind, string, number]>([
    ['up_a_lot', 'var(--color-ink)', 2],
    ['up', 'var(--color-ink)', 1],
    ['down', 'var(--color-wrong)', 1],
    ['down_a_lot', 'var(--color-wrong)', 2],
  ])('draws %s as a surface ring, a %s disc and %i chevrons', (kind, fill, chevrons) => {
    const { container } = render(<ChangeBadge kind={kind} />);

    const [ring, disc] = container.querySelectorAll('circle');
    expect(ring).toHaveAttribute('r', '9.5');
    expect(ring).toHaveAttribute('fill', 'var(--color-surface)');
    expect(disc).toHaveAttribute('r', '7.5');
    expect(disc).toHaveAttribute('fill', fill);
    const path = container.querySelector('path')!;
    expect(chevronCount(path)).toBe(chevrons);
    expect(path).toHaveAttribute('fill', 'none');
    expect(path).toHaveAttribute('stroke', 'var(--color-surface)');
    expect(path).toHaveAttribute('stroke-width', '1.8');
  });

  it('points up for the up kinds and down for the down kinds', () => {
    const { container } = render(
      <>
        <ChangeBadge kind="up" />
        <ChangeBadge kind="down" />
      </>,
    );

    const [up, down] = container.querySelectorAll('path');
    expect(up).toHaveAttribute('d', 'M6.6 10.8 9.5 8.2 12.4 10.8');
    expect(down).toHaveAttribute('d', 'M6.6 8.2 9.5 10.8 12.4 8.2');
  });

  it('draws no change as an aside-outlined circle and a dash', () => {
    const { container } = render(<ChangeBadge kind="no_change" />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('r', '8.75');
    expect(circles[0]).toHaveAttribute('fill', 'var(--color-surface)');
    expect(circles[0]).toHaveAttribute('stroke', 'var(--color-aside)');
    const dash = container.querySelector('path')!;
    expect(dash).toHaveAttribute('d', 'M7 9.5h5');
    expect(dash).toHaveAttribute('stroke', 'var(--color-aside)');
  });

  it('is silent, sized by a class in rem on a fixed viewBox, and takes a class', () => {
    const { container } = render(<ChangeBadge kind="up" className="absolute" />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 19 19');
    expect(svg).toHaveClass('size-[1.1875rem]', 'absolute');
  });
});
