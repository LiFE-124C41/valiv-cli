declare module 'marked-terminal' {
  import { Renderer } from 'marked';
  export default class TerminalRenderer extends Renderer {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(options?: any);
  }
}
