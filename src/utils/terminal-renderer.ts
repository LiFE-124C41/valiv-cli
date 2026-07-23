import { Renderer, Tokens } from 'marked';

/**
 * Custom marked renderer that formats Markdown into ANSI-styled text for terminal output.
 */
export class TerminalRenderer extends Renderer {
  override heading({ text, depth }: Tokens.Heading): string {
    const headingText = text.trim();
    return `\n\x1b[1m\x1b[36m${'#'.repeat(depth)} ${headingText}\x1b[0m\n\n`;
  }

  override paragraph({ text }: Tokens.Paragraph): string {
    return `${text}\n\n`;
  }

  override strong({ text }: Tokens.Strong): string {
    return `\x1b[1m\x1b[33m${text}\x1b[0m`;
  }

  override em({ text }: Tokens.Em): string {
    return `\x1b[3m${text}\x1b[0m`;
  }

  override codespan({ text }: Tokens.Codespan): string {
    return `\x1b[33m\`${text}\`\x1b[0m`;
  }

  override code({ text, lang }: Tokens.Code): string {
    const langStr = lang ? ` [${lang}]` : '';
    return `\n\x1b[90m\`\`\`${langStr}\n${text}\n\`\`\`\x1b[0m\n\n`;
  }

  override list({ items, ordered }: Tokens.List): string {
    const listItems = items
      .map((item, index) => {
        const prefix = ordered ? `${index + 1}. ` : '• ';
        return `  ${prefix}${item.text}`;
      })
      .join('\n');
    return `${listItems}\n\n`;
  }

  override listitem({ text }: Tokens.ListItem): string {
    return text;
  }

  override link({ href, text }: Tokens.Link): string {
    return `\x1b[4m\x1b[34m${text}\x1b[0m (\x1b[90m${href}\x1b[0m)`;
  }

  override hr(): string {
    return `\n\x1b[90m---\x1b[0m\n\n`;
  }

  override blockquote({ text }: Tokens.Blockquote): string {
    return `\x1b[90m> ${text.split('\n').join('\n> ')}\x1b[0m\n\n`;
  }
}
