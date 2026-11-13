import { describe, expect, it } from 'vitest';
import { countChanges, type ChangeKind } from 'src/lib/changeKinds';

const cards = (...kinds: ChangeKind[]) => kinds.map((change) => ({ change }));

describe('countChanges', () => {
  it('counts the cards of each of the five kinds', () => {
    expect(
      countChanges(cards('up', 'down_a_lot', 'up', 'no_change', 'up_a_lot', 'down', 'up')),
    ).toEqual({ up_a_lot: 1, up: 3, no_change: 1, down: 1, down_a_lot: 1 });
  });

  it('gives every kind no card had a 0', () => {
    expect(countChanges(cards('down'))).toEqual({
      up_a_lot: 0,
      up: 0,
      no_change: 0,
      down: 1,
      down_a_lot: 0,
    });
    expect(countChanges([])).toEqual({ up_a_lot: 0, up: 0, no_change: 0, down: 0, down_a_lot: 0 });
  });
});
