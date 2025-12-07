import { describe, it, expect } from 'vitest';
import { filterCreators } from './filter.js';
import { Creator } from '../domain/models.js';

describe('filterCreators', () => {
  const mockCreators: Creator[] = [
    {
      id: 'manaka_tomori',
      name: 'Manaka Tomori',
      youtubeChannelId: 'UCuWoH9mx0EgT69UyVxaw1NQ',
      xUsername: 'TomoriManaka',
    },
    {
      id: 'cosmo_kamizuru',
      name: 'Cosmo Kamizuru',
      youtubeChannelId: 'UCU8VGKDhiSHLerg4wYXjhtw',
      xUsername: 'KamizuruCosmo',
    },
    {
      id: 'sara_letora_oliveira_utagawa',
      name: 'Sara Letora Oliveira Utagawa',
      youtubeChannelId: 'UCBpLt5oWnDnG1ni5f33gcEQ',
      xUsername: 'UtagawaLetora',
    },
  ];

  it('should return all creators if query is empty', () => {
    const result = filterCreators(mockCreators, '');
    expect(result).toEqual(mockCreators);
  });

  it('should filter by name (partial match)', () => {
    const result = filterCreators(mockCreators, 'mana');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Manaka Tomori');
  });

  it('should filter by name (case-insensitive)', () => {
    const result = filterCreators(mockCreators, 'MANAKA');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Manaka Tomori');
  });

  it('should filter by multiple keywords (AND logic)', () => {
    const result = filterCreators(mockCreators, 'tomori manaka');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Manaka Tomori');
  });

  it('should filter by ID', () => {
    const result = filterCreators(mockCreators, 'cosmo_kamizuru');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cosmo Kamizuru');
  });

  it('should filter by X Username', () => {
    const result = filterCreators(mockCreators, 'UtagawaLetora');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sara Letora Oliveira Utagawa');
  });

  it('should filter by ID (partial match, case-insensitive)', () => {
    // "COSMO" matches "cosmo_kamizuru"
    const result = filterCreators(mockCreators, 'COSMO');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cosmo Kamizuru');
  });

  it('should filter by X Username (partial match, case-insensitive)', () => {
    // "letora" matches "UtagawaLetora"
    const result = filterCreators(mockCreators, 'letora');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sara Letora Oliveira Utagawa');
  });

  it('should return empty array if no match found', () => {
    const result = filterCreators(mockCreators, 'unknown');
    expect(result).toHaveLength(0);
  });

  it('should handle partial match across multiple fields', () => {
    // "tomori" matches name, "manaka" matches name
    const result = filterCreators(mockCreators, 'tomori manaka');
    expect(result).toHaveLength(1);
  });
});
