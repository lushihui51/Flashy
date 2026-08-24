// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardSummaryRow from 'src/components/library/CardSummaryRow';

const fieldDefs = [
  { id: 'f1', name: 'Front', type: 'text' as const, position: 0 },
  { id: 'f2', name: 'Back', type: 'text' as const, position: 1 },
];

describe('CardSummaryRow', () => {
  it('shows the first field as title and the second as a muted subtitle', () => {
    render(<CardSummaryRow fieldDefs={fieldDefs} values={{ f1: 'Bonjour', f2: 'Hello' }} />);

    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('falls back to "Untitled card" when the first field is blank', () => {
    render(<CardSummaryRow fieldDefs={fieldDefs} values={{ f1: '', f2: 'Hello' }} />);

    expect(screen.getByText('Untitled card')).toBeInTheDocument();
  });

  it('omits the subtitle when the second field is blank', () => {
    render(<CardSummaryRow fieldDefs={fieldDefs} values={{ f1: 'Bonjour', f2: '' }} />);

    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('omits the subtitle when there is only one field', () => {
    render(
      <CardSummaryRow fieldDefs={[fieldDefs[0]!]} values={{ f1: 'Bonjour' }} />,
    );

    expect(screen.getByText('Bonjour')).toBeInTheDocument();
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });
});
