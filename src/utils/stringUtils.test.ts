import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  abbreviateNumber,
  formatSubscriberCount,
} from './stringUtils.js';

describe('stripHtml', () => {
  it('removes simple html tags', () => {
    const input = '<p>Hello <b>World</b></p>';
    const expected = 'Hello World';
    expect(stripHtml(input)).toBe(expected);
  });

  it('removes attributes in tags', () => {
    const input = '<a href="http://example.com">Link</a>';
    const expected = 'Link (http://example.com)';
    expect(stripHtml(input)).toBe(expected);
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('handles string without tags', () => {
    const input = 'Just text';
    expect(stripHtml(input)).toBe(input);
  });

  it('removes br tags and converts to newlines', () => {
    const input = 'Line 1<br>Line 2<br/>Line 3';
    const expected = 'Line 1\nLine 2\nLine 3';
    expect(stripHtml(input)).toBe(expected);
  });

  it('preserves urls in anchor tags', () => {
    const input = 'Check this <a href="https://example.com">Link</a>';
    const expected = 'Check this Link (https://example.com)';
    expect(stripHtml(input)).toBe(expected);
  });

  it('handles complex schedule description', () => {
    const input = `▼投稿チャンネル<br>
レトラTwitch   チャンネル<br>
<a href="https://www.twitch.tv/utagawaletora">https://www.twitch.tv/utagawaletora</a><br>
<br>
-<br>
<br>
■ レトラ  (Letora) <br>
▷YouTube <a href="https://bnent.jp/UtagawaLetora/">https://bnent.jp/UtagawaLetora/</a> <br>
▷Twitter <a href="https://twitter.com/UtagawaLetora">https://twitter.com/UtagawaLetora</a>`;

    const expected = `▼投稿チャンネル
レトラTwitch   チャンネル
https://www.twitch.tv/utagawaletora

-

■ レトラ  (Letora) 
▷YouTube https://bnent.jp/UtagawaLetora/ 
▷Twitter https://twitter.com/UtagawaLetora`;

    expect(stripHtml(input)).toBe(expected);
  });

  it('handles google calendar redirect urls', () => {
    const input =
      'Link: <a href="https://www.google.com/url?q=https://www.twitch.tv/utagawaletora&sa=D&source=calendar&usd=2&usg=AOvVaw2X87_Ixwqb1ZjGGSvyn6tu">https://www.twitch.tv/utagawaletora</a>';
    const expected = 'Link: https://www.twitch.tv/utagawaletora';
    expect(stripHtml(input)).toBe(expected);
  });

  it('handles google calendar redirect urls with nested tags', () => {
    const input =
      'Link: <a href="https://www.google.com/url?q=https://bnent.jp/UtagawaLetora/&sa=D&source=calendar&usd=2&usg=AOvVaw39npP2APvD3nnNutlPa7c_"><u>https://bnent.jp/UtagawaLetora/</u></a>';
    const expected = 'Link: https://bnent.jp/UtagawaLetora/';
    expect(stripHtml(input)).toBe(expected);
  });
});

describe('abbreviateNumber', () => {
  it('abbreviates thousands', () => {
    expect(abbreviateNumber(1234)).toBe('1.2K');
    expect(abbreviateNumber(1500)).toBe('1.5K');
  });

  it('abbreviates millions', () => {
    expect(abbreviateNumber(1234567)).toBe('1.23M');
  });

  it('returns as string if less than 1000', () => {
    expect(abbreviateNumber(999)).toBe('999');
  });
});

describe('formatSubscriberCount', () => {
  it('formats with abbreviation by default (detail=false/undefined)', () => {
    expect(formatSubscriberCount('1234')).toBe('1.2K');
    expect(formatSubscriberCount('1234', false)).toBe('1.2K');
  });

  it('formats with locale string when detail=true', () => {
    // Note: toLocaleString output depends on locale. Assuming Node default includes commas for US/JP
    // We can allow flexible matching or force a locale if possible, but browsers/node usually default to en-US behavior for these tests.
    // If this fails due to locale, we might need to mock toLocaleString or be specific.
    // Let's assume standard behavior for now.
    expect(formatSubscriberCount('1234', true)).toMatch(/1,234/);
    expect(formatSubscriberCount('1000000', true)).toMatch(/1,000,000/);
  });

  it('handles non-numeric strings', () => {
    expect(formatSubscriberCount('invalid')).toBe('invalid');
  });
});
