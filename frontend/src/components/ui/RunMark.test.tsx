// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RunMark from 'src/components/ui/RunMark';

describe('RunMark', () => {
  it('is an image named "Run"', () => {
    render(<RunMark />);

    expect(screen.getByRole('img', { name: 'Run' })).toBeInTheDocument();
  });

  it('draws a flash inside a circle as an outline in the color of its words', () => {
    const { container } = render(<RunMark />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    const circle = container.querySelector('circle')!;
    expect(circle).toHaveAttribute('cx', '12');
    expect(circle).toHaveAttribute('cy', '12');
    expect(circle).toHaveAttribute('r', '10.5');
    const path = container.querySelector('path')!;
    expect(path).toHaveAttribute('d', 'M13 5 7 13h5l-1 6 6-8h-5l1-6z');
    expect(path).toHaveAttribute('stroke-width', '1.8');
  });
});
