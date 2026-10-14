import { expiresWithinADay, expiryDay } from './expiry';

describe('expiry', () => {
  // Local time, as the pages: the tests do not depend on the machine's time zone
  const now = new Date(2026, 9, 14, 10, 0);

  describe('expiryDay', () => {
    it('should say "aujourd\'hui" for a file expiring tonight', () => {
      expect(expiryDay(new Date(2026, 9, 14, 18, 0), now)).toBe("aujourd'hui");
    });

    it('should count calendar days: tomorrow afternoon is "demain", even 28 h ahead', () => {
      expect(expiryDay(new Date(2026, 9, 15, 14, 0), now)).toBe('demain');
    });

    it('should count the days beyond tomorrow', () => {
      expect(expiryDay(new Date(2026, 9, 16, 8, 0), now)).toBe('dans 2 jours');
    });

    it('should not lose a day when summer time starts', () => {
      // In France, 2027-03-28 lasts 23 h: these 3 days are one hour short
      expect(expiryDay(new Date(2027, 2, 30, 10, 0), new Date(2027, 2, 27, 10, 0))).toBe('dans 3 jours');
    });
  });

  describe('expiresWithinADay', () => {
    it('should be true under 24 h', () => {
      expect(expiresWithinADay(new Date(2026, 9, 15, 9, 59), now)).toBe(true);
    });

    it('should be false from 24 h', () => {
      expect(expiresWithinADay(new Date(2026, 9, 15, 10, 0), now)).toBe(false);
    });
  });
});
