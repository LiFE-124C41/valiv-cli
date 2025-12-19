export const stripHtml = (html: string): string => {
  if (!html) return '';

  let processed = html;

  // Replace <br> with newline, consuming subsequent newlines
  processed = processed.replace(/<br\s*\/?>[\r\n]*/gi, '\n');

  // Preserve URLs in anchor tags
  processed = processed.replace(
    /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi,
    (match, url, text) => {
      // Clean up text (remove nested tags)
      const cleanText = text.replace(/<[^>]*>?/gm, '').trim();

      // Handle Google Redirects
      let cleanUrl = url;
      if (url.includes('google.com/url') && url.includes('q=')) {
        const match = url.match(/[?&]q=([^&]+)/);
        if (match && match[1]) {
          cleanUrl = decodeURIComponent(match[1]);
        }
      }

      if (cleanUrl === cleanText || cleanText.includes(cleanUrl)) {
        return cleanText; // Prefer text if it matches URL (often formatted better)
      }
      return `${cleanText} (${cleanUrl})`;
    },
  );

  // Remove remaining tags
  processed = processed.replace(/<[^>]*>?/gm, '');

  // Decode common entities
  processed = processed
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return processed;
};

export const abbreviateNumber = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
};

export const formatSubscriberCount = (
  count: string,
  detail?: boolean,
): string => {
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  return detail ? num.toLocaleString() : abbreviateNumber(num);
};
