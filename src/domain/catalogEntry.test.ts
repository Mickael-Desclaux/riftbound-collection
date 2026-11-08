import { withOwnedQuantities } from './catalogEntry';
import { entry } from './testing/catalogEntries';

describe('withOwnedQuantities', () => {
  it('donne à chaque Version sa quantité dans la Collection, 0 sinon', () => {
    const entries = [entry('OGN-001'), entry('OGN-002')];

    const result = withOwnedQuantities(entries, new Map([['OGN-002', 3]]));

    expect(result.map((e) => e.ownedQuantity)).toEqual([0, 3]);
  });
});
