import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { IVideoPlayerService } from '../../infrastructure/video-player-service.js';

interface AudioPlayerProps {
    service: IVideoPlayerService;
    onExit: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ service, onExit }) => {
    const [status, setStatus] = useState<'playing' | 'paused'>('playing');
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);

    useInput((input, key) => {
        if (input === 'q') {
            onExit();
        }
        if (input === ' ') {
            service.togglePause();
            setStatus(prev => prev === 'playing' ? 'paused' : 'playing');
        }
        if (key.leftArrow) {
            service.seek(-5);
        }
        if (key.rightArrow) {
            service.seek(5);
        }
        if (key.upArrow) {
            service.adjustVolume(5);
            setVolume(prev => Math.min(prev + 5, 130)); // MPV max volume is usually higher but cap UI at 130
        }
        if (key.downArrow) {
            service.adjustVolume(-5);
            setVolume(prev => Math.max(prev - 5, 0));
        }
    });

    useEffect(() => {
        // Polling fallback
        const interval = setInterval(async () => {
            try {
                const timePos = await service.getProperty('time-pos');
                const dur = await service.getProperty('duration');

                if (timePos !== null && timePos !== undefined) {
                    setCurrentTime(Number(timePos));
                }
                if (dur !== null && dur !== undefined) {
                    setDuration(Number(dur));
                }
            } catch (e) {
                // Ignore errors during polling
            }
        }, 1000);

        service.on('statuschange', (status: any) => {
            if (status.duration) {
                setDuration(Number(status.duration));
            }
            if (status['time-pos']) {
                setCurrentTime(Number(status['time-pos']));
            }
        });

        service.on('timeposition', (seconds: number) => {
            setCurrentTime(seconds);
        });

        service.on('duration', (seconds: number) => {
            setDuration(seconds);
        });

        return () => clearInterval(interval);
    }, [service]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
    const barWidth = 30;
    const filledWidth = Math.round(progress * barWidth);
    const progressBar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
            <Text bold color="green">Audio Player</Text>
            <Box marginY={1}>
                <Text color={status === 'playing' ? 'green' : 'yellow'}>
                    {status === 'playing' ? '▶ Playing' : '⏸ Paused'}
                </Text>
                <Text>  Vol: {volume}%</Text>
            </Box>
            <Box>
                <Text color="cyan">{progressBar}</Text>
                <Text> {formatTime(currentTime)} / {formatTime(duration)}</Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>
                    [Space] Pause/Resume  [←/→] Seek  [↑/↓] Volume  [q] Stop
                </Text>
            </Box>
        </Box>
    );
};
