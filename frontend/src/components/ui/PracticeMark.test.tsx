// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeMark from 'src/components/ui/PracticeMark';

describe('PracticeMark', () => {
  it('is an image named "Practice"', () => {
    render(<PracticeMark />);

    expect(screen.getByRole('img', { name: 'Practice' })).toBeInTheDocument();
  });

  it('draws a flash of lightning as an outline in the color of its words', () => {
    const { container } = render(<PracticeMark />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    expect(container.querySelector('path')).toHaveAttribute('d', 'M13 2 3 14h9l-1 8 10-12h-9l1-8z');
  });
});
