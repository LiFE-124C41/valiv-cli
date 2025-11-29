import { describe, it, expect } from 'vitest';
import { VALIV_MEMBERS } from './constants';

describe('VALIV_MEMBERS', () => {
    it('should have 4 members', () => {
        expect(VALIV_MEMBERS.length).toBe(4);
    });

    it('should contain Manaka Tomori', () => {
        const member = VALIV_MEMBERS.find(m => m.id === 'manaka_tomori');
        expect(member).toBeDefined();
        expect(member?.name).toBe('Manaka Tomori');
        expect(member?.youtubeChannelId).toBe('UCuWoH9mx0EgT69UyVxaw1NQ');
        expect(member?.xUsername).toBe('TomoriManaka');
    });

    it('should contain Cosmo Kamizuru', () => {
        const member = VALIV_MEMBERS.find(m => m.id === 'cosmo_kamizuru');
        expect(member).toBeDefined();
        expect(member?.name).toBe('Cosmo Kamizuru');
    });

    it('should contain Sara Letora Oliveira Utagawa', () => {
        const member = VALIV_MEMBERS.find(m => m.id === 'sara_letora_oliveira_utagawa');
        expect(member).toBeDefined();
        expect(member?.name).toBe('Sara Letora Oliveira Utagawa');
        expect(member?.twitchChannelId).toBe('utagawaletora');
    });

    it('should contain va-liv official', () => {
        const member = VALIV_MEMBERS.find(m => m.id === 'valiv_official');
        expect(member).toBeDefined();
        expect(member?.name).toBe('va-liv official');
    });
});
