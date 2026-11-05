// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MasteryCircle from 'src/components/ui/MasteryCircle';

function pathEnd(path: Element): [number, number] {
  const numbers = path.getAttribute('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return [numbers.at(-2)!, numbers.at(-1)!];
}

describe('MasteryCircle', () => {
  it('speaks its readiness as a whole percentage', () => {
    render(<MasteryCircle readiness={0.424} size="row" />);

    expect(screen.getByRole('img', { name: 'Mastery 42%' })).toBeInTheDocument();
  });

  it('draws no number', () => {
    render(<MasteryCircle readiness={0.424} size="row" />);

    expect(screen.getByRole('img')).toHaveTextContent(/^$/);
  });

  it('renders no path at 0, only the empty outline', () => {
    const { container } = render(<MasteryCircle readiness={0} size="row" />);

    expect(container.querySelector('path')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(screen.getByRole('img', { name: 'Mastery 0%' })).toBeInTheDocument();
  });

  it('renders a filled circle at 1, with no path', () => {
    const { container } = render(<MasteryCircle readiness={1} size="row" />);

    expect(container.querySelector('path')).toBeNull();
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2);
    expect(circles[1]).toHaveAttribute('fill', 'var(--color-ink)');
    expect(screen.getByRole('img', { name: 'Mastery 100%' })).toBeInTheDocument();
  });

  it("ends 0.25's path at the circle's right-hand point", () => {
    const { container } = render(<MasteryCircle readiness={0.25} size="row" />);

    const [x, y] = pathEnd(container.querySelector('path')!);
    expect(x).toBeCloseTo(20.5, 2);
    expect(y).toBeCloseTo(11, 2);
  });

  it('takes the long way round past half a turn', () => {
    const { container } = render(<MasteryCircle readiness={0.68} size="row" />);

    expect(container.querySelector('path')!.getAttribute('d')).toContain('0 1 1 ');
  });

  it('draws each size on its own viewBox and radius, sized by a class in rem', () => {
    const { container } = render(
      <>
        <MasteryCircle readiness={0.5} size="row" />
        <MasteryCircle readiness={0.5} size="heading" />
      </>,
    );

    const [row, heading] = container.querySelectorAll('svg');
    expect(row).toHaveAttribute('viewBox', '0 0 22 22');
    expect(row!.querySelector('circle')).toHaveAttribute('r', '9.5');
    expect(row).toHaveClass('size-[1.375rem]');
    expect(row).not.toHaveAttribute('width');
    expect(heading).toHaveAttribute('viewBox', '0 0 30 30');
    expect(heading!.querySelector('circle')).toHaveAttribute('r', '13.5');
    expect(heading).toHaveClass('size-[1.875rem]');
    expect(heading).not.toHaveAttribute('height');
  });
});
