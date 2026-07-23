import { describe, it, expect } from 'vitest';
import { marked } from 'marked';
import { TerminalRenderer } from './terminal-renderer.js';

describe('TerminalRenderer', () => {
  it('should render headers, strong, and lists correctly', () => {
    marked.setOptions({
      renderer: new TerminalRenderer(),
    });

    const markdown = `# Title\n\n**Bold Text**\n\n- Item 1\n- Item 2`;
    const result = marked.parse(markdown) as string;

    expect(result).toContain('# Title');
    expect(result).toContain('Bold Text');
    expect(result).toContain('• Item 1');
    expect(result).toContain('• Item 2');
  });

  it('should render code blocks and links correctly', () => {
    marked.setOptions({
      renderer: new TerminalRenderer(),
    });

    const markdown = `\`\`\`js\nconst a = 1;\n\`\`\`\n\n[Google](https://google.com)`;
    const result = marked.parse(markdown) as string;

    expect(result).toContain('``` [js]');
    expect(result).toContain('const a = 1;');
    expect(result).toContain('Google');
    expect(result).toContain('https://google.com');
  });
});
