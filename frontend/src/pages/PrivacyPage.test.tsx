// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PrivacyPage from 'src/pages/PrivacyPage';

const PARTS = [
  ['Looking around', 'If you look around without logging in, Flashy keeps nothing about you.'],
  [
    'Signing in',
    'You sign in through Clerk, a sign-in service. When you sign in with Google, Clerk receives your name, email address and profile picture. Flashy shows them in your account and uses them for nothing else.',
  ],
  [
    'What Flashy keeps',
    'What you make and do in Flashy: your decks, cards, practices and runs, every rating you give, and when you started your first run. And your time zone, so dates show in your own time.',
  ],
  [
    'Who else has it',
    "Flashy sells nothing, shares nothing and has no ads or tracking. Clerk holds your sign-in, and everything else is stored on Railway, the service that runs Flashy's server.",
  ],
  [
    'Deleting it',
    '"Delete account", in your account, deletes your account and everything in it at once. It can\'t be undone.',
  ],
  ['Questions', 'Write to shihui.lu51@gmail.com.'],
];

const OPENING_LINE =
  'Flashy is run by Jaden Lu. This page says what Flashy keeps about you, and why.';

describe('PrivacyPage', () => {
  it('heads the page "Privacy" and names the tab after it', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy');
    expect(document.title).toBe('Privacy · Flashy');
  });

  it('shows its heading, its opening line, then each heading over its words, in order', () => {
    const { container } = render(<PrivacyPage />);

    const blocks = [...container.querySelectorAll('h1, h2, p')].map((block) => block.textContent);
    expect(blocks).toEqual(['Privacy', OPENING_LINE, ...PARTS.flat()]);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(
      PARTS.map(([heading]) => heading),
    );
  });

  it('links the address to write to as a mailto: address', () => {
    render(<PrivacyPage />);

    expect(screen.getByRole('link', { name: 'shihui.lu51@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:shihui.lu51@gmail.com',
    );
  });
});
