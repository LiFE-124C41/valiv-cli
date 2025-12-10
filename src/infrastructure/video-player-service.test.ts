/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import { VideoPlayerService } from './video-player-service.js';
import NodeMpv from 'node-mpv';
import { exec, spawn } from 'child_process';

// Mock node-mpv
vi.mock('node-mpv', () => {
  const NodeMpvMock = vi.fn();
  NodeMpvMock.prototype.load = vi.fn();
  NodeMpvMock.prototype.start = vi.fn();
  NodeMpvMock.prototype.quit = vi.fn();
  NodeMpvMock.prototype.on = vi.fn();
  NodeMpvMock.prototype.seek = vi.fn();
  NodeMpvMock.prototype.togglePause = vi.fn();
  NodeMpvMock.prototype.adjustVolume = vi.fn();
  NodeMpvMock.prototype.getProperty = vi.fn();
  NodeMpvMock.prototype.setProperty = vi.fn();
  NodeMpvMock.prototype.observeProperty = vi.fn();

  return {
    __esModule: true,
    default: NodeMpvMock,
  };
});

// Mock child_process
vi.mock('child_process', () => {
  return {
    exec: vi.fn(),
    spawn: vi.fn(),
  };
});

describe('VideoPlayerService', () => {
  let service: VideoPlayerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VideoPlayerService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('play', () => {
    it('should play video using MPV if available', async () => {
      vi.useFakeTimers();

      // Mock exec to simulate mpv installed
      (exec as unknown as Mock).mockImplementation((cmd, cb) => {
        cb(null, 'path/to/mpv');
      });

      // Capture mock instance creation
      let capturedMpv: any;
      (NodeMpv as unknown as Mock).mockImplementation(function (this: any) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        capturedMpv = this;
        this.load = vi.fn().mockResolvedValue(undefined);
        this.observeProperty = vi.fn();
        this.getProperty = vi.fn().mockResolvedValue(10); // Return number to simulate playback start
        this.setProperty = vi.fn();
        this.seek = vi.fn();
        return this;
      });

      const playPromise = service.play('http://example.com/video');

      // Advance times to handle the 2000ms delay in code
      await vi.advanceTimersByTimeAsync(2500);

      await playPromise;

      expect(exec).toHaveBeenCalled();
      expect(NodeMpv).toHaveBeenCalled();

      expect(capturedMpv.load).toHaveBeenCalledWith('http://example.com/video');
    });

    it('should fallback to browser if MPV is not available', async () => {
      // Mock exec to simulate mpv NOT installed
      (exec as unknown as Mock).mockImplementation((cmd, cb) => {
        cb(new Error('Command not found'), null);
      });

      const spawnMock = { unref: vi.fn() };
      (spawn as unknown as Mock).mockReturnValue(spawnMock);

      await service.play('http://example.com/video');

      // Wait a bit loop for dynamic import resolution (microtasks)
      // Since play() is not awaiting the import, we need to wait for it.
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(exec).toHaveBeenCalled();
      // Expect NOT call NodeMpv constructor
      expect(NodeMpv).not.toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
    });

    it('should configure MPV with correct options', async () => {
      vi.useFakeTimers();

      // Mock exec success
      (exec as unknown as Mock).mockImplementation((cmd, cb) => {
        cb(null, 'ok');
      });

      (NodeMpv as unknown as Mock).mockImplementation(function (this: any) {
        // Re-mock for this test
        this.load = vi.fn().mockResolvedValue(undefined);
        this.observeProperty = vi.fn();
        this.getProperty = vi.fn().mockResolvedValue(10);
        this.setProperty = vi.fn();
        return this;
      });

      const playPromise = service.play('http://url', {
        audioOnly: true,
        debug: true,
      });

      await vi.advanceTimersByTimeAsync(2500);
      await playPromise;

      // Check constructor args
      const callArgs = (NodeMpv as unknown as Mock).mock.calls[0];
      const options = callArgs[0];
      const args = callArgs[1];

      expect(options.verbose).toBe(true);
      expect(args).toContain('--no-video');
      expect(args).toContain('--log-file=valiv_debug.log');
    });
  });

  describe('control methods', () => {
    // Setup helper to initialize MPV
    const initMpv = async () => {
      vi.useFakeTimers();
      // Mock exec success
      (exec as unknown as Mock).mockImplementation((cmd, cb) => cb(null, 'ok'));
      (NodeMpv as unknown as Mock).mockImplementation(function (this: any) {
        this.load = vi.fn();
        this.observeProperty = vi.fn();
        this.getProperty = vi.fn().mockResolvedValue(10);
        this.setProperty = vi.fn();
        this.quit = vi.fn();
        this.seek = vi.fn();
        this.togglePause = vi.fn();
        this.adjustVolume = vi.fn();
        return this;
      });
      const playPromise = service.play('url');
      await vi.advanceTimersByTimeAsync(2500);
      await playPromise;
      return (NodeMpv as unknown as Mock).mock.instances[0];
    };

    it('stop should call mpv.quit', async () => {
      const mpv = await initMpv();
      await service.stop();
      expect(mpv.quit).toHaveBeenCalled();
    });

    it('seek should call mpv.seek', async () => {
      const mpv = await initMpv();
      await service.seek(30);
      expect(mpv.seek).toHaveBeenCalledWith(30);
    });

    it('togglePause should call mpv.togglePause', async () => {
      const mpv = await initMpv();
      await service.togglePause();
      expect(mpv.togglePause).toHaveBeenCalled();
    });

    it('adjustVolume should call mpv.adjustVolume', async () => {
      const mpv = await initMpv();
      await service.adjustVolume(10);
      expect(mpv.adjustVolume).toHaveBeenCalledWith(10);
    });
  });
});
