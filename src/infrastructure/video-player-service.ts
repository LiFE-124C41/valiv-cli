import { exec } from 'child_process';
import NodeMpv from 'node-mpv';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VideoPlayerOptions {
  audioOnly?: boolean;
  debug?: boolean;
  start?: number;
  end?: number;
}

export interface IVideoPlayerService {
  play(url: string, options?: VideoPlayerOptions): Promise<void>;
  stop(): Promise<void>;
  on(event: string, callback: (data: unknown) => void): void;
  seek(seconds: number): Promise<void>;
  togglePause(): Promise<void>;
  adjustVolume(delta: number): Promise<void>;
  getProperty(property: string): Promise<unknown>;
}

export class VideoPlayerService implements IVideoPlayerService {
  private mpvAvailable: boolean | null = null;
  private mpv: NodeMpv | null = null;

  async play(url: string, options?: VideoPlayerOptions): Promise<void> {
    if (this.mpvAvailable === null) {
      this.mpvAvailable = await this.checkMpvAvailability();
    }

    if (this.mpvAvailable) {
      try {
        if (!this.mpv) {
          const mpvArgs = [
            '--cache=yes',
            '--demuxer-max-bytes=128MiB',
            '--demuxer-readahead-secs=20',
            '--ytdl-raw-options-append=verbose=',
            '--ytdl-raw-options-append=retries=3',
            '--no-terminal',
            '--really-quiet',
          ];
          if (options?.audioOnly) {
            mpvArgs.push('--no-video');
          }
          if (options?.debug) {
            mpvArgs.push('--log-file=valiv_debug.log');
            mpvArgs.push('--msg-level=all=trace');
          }
          // Removed global start/end args to prevent persistence across playlist items

          this.mpv = new NodeMpv(
            {
              verbose: options?.debug || false,
              debug: options?.debug || false,
              time_update: 1, // Update time every second
            },
            mpvArgs,
          );
        }

        // Wait a bit to ensure MPV is ready to receive commands
        // Increased to 2000ms to avoid ENOENT on Windows named pipes
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Observe duration property to ensure we get updates
        this.mpv?.observeProperty('duration');
        this.mpv?.observeProperty('time-pos');

        if (this.mpv) {
          try {
            await this.mpv.load(url);

            // Wait for playback to start by polling time-pos
            // This ensures the video is actually loaded and ready to seek
            let attempts = 0;
            const maxAttempts = 20; // Wait up to 10 seconds (20 * 500ms)

            while (attempts < maxAttempts) {
              try {
                const timePos = await this.mpv.getProperty('time-pos');
                if (typeof timePos === 'number') {
                  break; // Playback started
                }
              } catch (e) {
                // Ignore errors while waiting
              }
              await new Promise((resolve) => setTimeout(resolve, 500));
              attempts++;
            }

            // Apply start time if provided
            if (options?.start !== undefined && options.start > 0) {
              await this.mpv.seek(options.start);
            }

            // Apply end time if provided
            if (options?.end !== undefined) {
              await this.mpv.setProperty('end', options.end);
            } else {
              await this.mpv.setProperty('end', 'none');
            }
          } catch (error) {
            console.error('Failed to load/seek with MPV:', error);
            throw error;
          }
        }
      } catch (error) {
        console.error(
          'Failed to play with MPV, falling back to browser:',
          error,
        );
        this.fallbackToBrowser(url);
      }
    } else {
      this.fallbackToBrowser(url);
    }
  }

  async stop(): Promise<void> {
    if (this.mpv) {
      try {
        await this.mpv.quit();
      } catch (error) {
        console.error('Failed to stop MPV:', error);
      }
      this.mpv = null;
    }
  }

  on(event: string, callback: (data: unknown) => void): void {
    if (this.mpv) {
      this.mpv.on(event, callback);
    }
  }

  async seek(seconds: number): Promise<void> {
    if (this.mpv) {
      await this.mpv.seek(seconds);
    }
  }

  async togglePause(): Promise<void> {
    if (this.mpv) {
      await this.mpv.togglePause();
    }
  }

  async adjustVolume(delta: number): Promise<void> {
    if (this.mpv) {
      await this.mpv.adjustVolume(delta);
    }
  }

  async getProperty(property: string): Promise<unknown> {
    if (this.mpv) {
      return await this.mpv.getProperty(property);
    }
    return null;
  }

  private async checkMpvAvailability(): Promise<boolean> {
    try {
      const command = process.platform === 'win32' ? 'where mpv' : 'which mpv';
      await execAsync(command);
      return true;
    } catch {
      return false;
    }
  }

  private fallbackToBrowser(url: string): void {
    let command: string;
    let args: string[] = [];

    if (process.platform === 'win32') {
      command = 'cmd.exe';
      args = ['/c', 'start', '""', url];
    } else {
      command = 'open';
      args = [url];
    }

    import('child_process').then(({ spawn }) => {
      const subprocess = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      subprocess.unref();
    });
  }
}
