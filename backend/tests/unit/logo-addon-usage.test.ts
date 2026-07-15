import { describe, expect, it } from 'vitest';
import {
  splitUsageCommit,
  splitUsageReservation,
} from '../../src/usage/usage.service';

describe('logo add-on usage accounting', () => {
  it('uses the monthly quota before purchased generations', () => {
    expect(splitUsageReservation(4, 2)).toEqual({
      includedReserved: 2,
      purchasedReserved: 2,
    });
  });

  it('does not touch purchased generations while monthly quota remains', () => {
    expect(splitUsageReservation(1, 5)).toEqual({
      includedReserved: 1,
      purchasedReserved: 0,
    });
  });

  it('returns unused purchased reservations after partial output', () => {
    expect(splitUsageCommit(2, 1, 3)).toEqual({
      includedActual: 1,
      purchasedActual: 1,
      purchasedUnused: 2,
    });
  });
});
