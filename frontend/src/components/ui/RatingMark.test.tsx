// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RatingMark from 'src/components/ui/RatingMark';

describe('RatingMark', () => {
  it.each([
    ['Again', 1, 'var(--color-wrong)'],
    ['Easy', 4, 'var(--color-ink)'],
  ])('draws %s as a solid dot', (_word, rating, colour) => {
    const { container } = render(<RatingMark rating={rating} />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('r', '6.5');
    expect(circles[0]).toHaveAttribute('fill', colour);
  });

  it.each([
    ['Hard', 2, 'var(--color-wrong)'],
    ['Good', 3, 'var(--color-ink)'],
  ])('draws %s as a ring over a dot', (_word, rating, colour) => {
    const { container } = render(<RatingMark rating={rating} />);

    const [ring, dot] = container.querySelectorAll('circle');
    expect(ring).toHaveAttribute('r', '5.75');
    expect(ring).toHaveAttribute('fill', 'none');
    expect(ring).toHaveAttribute('stroke', colour);
    expect(ring).toHaveAttribute('stroke-width', '1.5');
    expect(dot).toHaveAttribute('r', '3.25');
    expect(dot).toHaveAttribute('fill', colour);
  });

  it.each([
    ['null', null],
    ['a rating no tier matches', 5],
    ['zero', 0],
  ])('draws %s as not asked, an empty line-coloured ring', (_word, rating) => {
    const { container } = render(<RatingMark rating={rating} />);

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]).toHaveAttribute('r', '5.75');
    expect(circles[0]).toHaveAttribute('fill', 'none');
    expect(circles[0]).toHaveAttribute('stroke', 'var(--color-line)');
  });

  it('is silent, sized by a class in rem on a fixed viewBox', () => {
    const { container } = render(<RatingMark rating={3} />);

    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('viewBox', '0 0 13 13');
    expect(svg).toHaveClass('size-[0.8125rem]');
  });
});
