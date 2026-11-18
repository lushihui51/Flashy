// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from 'src/pages/AboutPage';

const LINES_IN_ORDER = [
  'About Flashy',
  "Flashcards for knowledge that doesn't fit on two sides of a card.",
  'One card, many fields',
  "A word's spelling, meaning, gender and example, all on one card.",
  'A new question every time',
  'Choose what each card shows and asks. Fields drawn at random keep the same card fresh.',
  'Mastery for every field',
  'See exactly what you know. The fields you know least come up most.',
  'How it works',
  'Make a deck and fill it with cards.',
  'Make a practice from your decks, and choose what each one asks.',
  'Start a run. Rate each answer, and missed cards come back.',
  "See how each card's mastery moved, then run it again.",
];

describe('AboutPage', () => {
  it('heads the page "About Flashy" and names the tab after it', () => {
    render(<AboutPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About Flashy');
    expect(document.title).toBe('About Flashy · Flashy');
  });

  it('shows its heading and each line in order', () => {
    render(<AboutPage />);

    const elements = LINES_IN_ORDER.map((line) => screen.getByText(line));
    const inDocumentOrder = [...elements].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    expect(inDocumentOrder.map((element) => element.textContent)).toEqual(LINES_IN_ORDER);
  });

  it("finds each idea's title by its text, none of them a heading", () => {
    render(<AboutPage />);

    for (const title of [
      'One card, many fields',
      'A new question every time',
      'Mastery for every field',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'About Flashy',
      'How it works',
    ]);
  });

  it('numbers the four steps of How it works', () => {
    render(<AboutPage />);

    const steps = screen.getAllByRole('listitem').filter((item) => item.closest('ol'));
    expect(steps.map((step) => step.textContent?.slice(0, 1))).toEqual(['1', '2', '3', '4']);
  });

  it('hides every idea icon from assistive technology', () => {
    const { container } = render(<AboutPage />);

    const icons = container.querySelectorAll('svg');
    expect(icons).toHaveLength(3);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});
