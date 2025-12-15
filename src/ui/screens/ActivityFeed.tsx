import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Text, Box, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import fs from 'fs';
import {
  IConfigRepository,
  IActivityService,
} from '../../domain/interfaces.js';
import { Activity } from '../../domain/models.js';
import { VideoPlayerService } from '../../infrastructure/video-player-service.js';
import { AudioPlayer } from '../components/AudioPlayer.js';
import { filterCreators } from '../../utils/filter.js';

interface ActivityFeedScreenProps {
  configRepo: IConfigRepository;
  youtubeService: IActivityService;
  filterId?: string;
  audioOnly?: boolean;
  playlist?: string;
  debug?: boolean;
  refresh?: boolean;
  disableColor?: boolean;
}

interface PlaylistItem {
  video_title: string;
  song_title: string;
  video_id: string;
  start_sec: number;
  end_sec: number;
  link: string;
}

const ActivityFeedScreen: React.FC<ActivityFeedScreenProps> = ({
  configRepo,
  youtubeService,
  filterId,
  audioOnly,
  playlist,
  debug,
  refresh,
  disableColor,
}) => {
  const { exit } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentColor, setCurrentColor] = useState<string | undefined>(
    undefined,
  );
  const [currentSymbol, setCurrentSymbol] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);

  // Playlist state
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);

  const playerServiceRef = useRef<VideoPlayerService | null>(null);

  const ITEMS_PER_PAGE = 10;

  useInput((input) => {
    if (input === 'q') {
      if (playerServiceRef.current) {
        playerServiceRef.current.stop();
      }
      exit();
      setTimeout(() => process.exit(0), 100);
    }
  });

  const loadPlaylistFromFile = useCallback(
    (filePath: string): PlaylistItem[] => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter((line) => line.trim() !== '');
        // Skip header if present (assuming first line is header if it contains 'video_title')
        const startIndex = lines[0].includes('video_title') ? 1 : 0;

        const items: PlaylistItem[] = lines
          .slice(startIndex)
          .map((line) => {
            // Handle CSV parsing carefully, considering potential commas in titles
            // For simplicity, assuming standard CSV format without quoted fields containing commas for now,
            // or that the specific format is strictly followed.
            // Given the example: video_title,song_title,video_id,start_sec,end_sec,link
            const parts = line.split(',');
            // Reconstruct if title had commas (simple heuristic: take last 5 parts as fixed fields)
            const fixedFieldsCount = 5;
            if (parts.length > 1 + fixedFieldsCount) {
              const titleParts = parts.slice(
                0,
                parts.length - fixedFieldsCount,
              );
              const otherParts = parts.slice(parts.length - fixedFieldsCount);
              return {
                video_title: titleParts.join(','),
                song_title: otherParts[0],
                video_id: otherParts[1],
                start_sec: parseInt(otherParts[2], 10),
                end_sec: parseInt(otherParts[3], 10),
                link: otherParts[4],
              };
            }

            return {
              video_title: parts[0],
              song_title: parts[1],
              video_id: parts[2],
              start_sec: parseInt(parts[3], 10),
              end_sec: parseInt(parts[4], 10),
              link: parts[5],
            };
          })
          .filter((item) => !isNaN(item.start_sec)); // Filter out invalid lines

        return items;
      } catch (err) {
        console.error('Failed to read playlist:', err);
        return [];
      }
    },
    [],
  );

  const playPlaylistItem = async (item: PlaylistItem, index: number) => {
    setIsLaunching(true);
    setCurrentPlaylistIndex(index);
    setCurrentTitle(`${item.song_title} / ${item.video_title}`);
    // Try to find author color/symbol if possible, or default
    // Extract author name from video title if formatted like "【...】...【#... / AuthorName】"
    // This is specific to the user's format, but we can try generic matching or just leave blank.

    if (!playerServiceRef.current) {
      playerServiceRef.current = new VideoPlayerService();
    }

    try {
      // Construct URL with time if needed, but we use start/end options
      const url = `https://www.youtube.com/watch?v=${item.video_id}`;

      await playerServiceRef.current.play(url, {
        audioOnly: true, // Playlist implies audio mode usually, or force it
        debug,
        start: item.start_sec,
        end: item.end_sec,
      });

      setIsPlayingAudio(true);

      // Set up event listener for end of file to play next
      // We need to handle this carefully to avoid multiple listeners
      // For now, AudioPlayer component can handle "next" logic via manual input,
      // but automatic playback requires monitoring 'eof-reached' or similar.
      // However, node-mpv might not emit 'eof' reliably for streams.
      // We can rely on the 'stopped' event or similar if the player quits,
      // but here we want it to stay open.
      // Actually, node-mpv wrapper might not expose a clean "finished" event for a file
      // without quitting if we don't use a playlist mode in MPV itself.
      // But we are managing the playlist in JS.

      // A simple way is to poll or wait for the player to stop/idle.
      // But VideoPlayerService wraps MPV.
    } catch (error) {
      console.error(error);
    } finally {
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    const fetchActivities = async () => {
      if (playlist) {
        const items = loadPlaylistFromFile(playlist);
        setPlaylistItems(items);
        setIsPlaylistMode(true);
        setLoading(false);

        // Auto-start playlist
        if (items.length > 0) {
          playPlaylistItem(items[0], 0);
        }
        return;
      }

      const allCreators = configRepo.getCreators();
      // Filter creators based on input (case-insensitive, partial match)
      const targetCreators = filterCreators(allCreators, filterId);

      // Always fetch for ALL creators to ensure cache consistency/utilization
      // If we only passed targetCreators, the service might return cached data for ALL (if exists),
      // or if it fetches fresh, it might overwrite the global cache with partial data.
      // Current architecture prefers fetching all to keep "youtube_activities" cache complete.
      const allActivities = await youtubeService.getActivities(
        allCreators,
        refresh,
      );

      // Filter the returned activities to only include those from targetCreators
      const results = allActivities.filter((activity) =>
        targetCreators.some((c) => c.id === activity.author?.id),
      );

      setActivities(results);
      setLoading(false);
    };

    fetchActivities();
  }, [
    configRepo,
    youtubeService,
    filterId,
    playlist,
    loadPlaylistFromFile,
    refresh,
  ]);

  const handleNext = () => {
    if (currentPlaylistIndex < playlistItems.length - 1) {
      playPlaylistItem(
        playlistItems[currentPlaylistIndex + 1],
        currentPlaylistIndex + 1,
      );
    }
  };

  const handlePrev = () => {
    if (currentPlaylistIndex > 0) {
      playPlaylistItem(
        playlistItems[currentPlaylistIndex - 1],
        currentPlaylistIndex - 1,
      );
    }
  };

  const handleReload = () => {
    if (playlist) {
      const newItems = loadPlaylistFromFile(playlist);
      if (newItems.length > 0) {
        setPlaylistItems(newItems);
        // Try to keep current index if possible
        let newIndex = currentPlaylistIndex;
        if (newIndex >= newItems.length) {
          newIndex = 0;
        }
        playPlaylistItem(newItems[newIndex], newIndex);
      }
    }
  };

  const handleSelect = async (item: { value: string }) => {
    if (item.value === 'next_page') {
      setPage((p) => p + 1);
      return;
    }
    if (item.value === 'prev_page') {
      setPage((p) => p - 1);
      return;
    }

    setIsLaunching(true);
    const url = item.value;

    const selectedActivity = activities.find((a) => a.url === url);
    if (selectedActivity) {
      setCurrentTitle(selectedActivity.title);
      setCurrentColor(selectedActivity.author?.color);
      setCurrentSymbol(selectedActivity.author?.symbol);
    }

    playerServiceRef.current = new VideoPlayerService();

    try {
      await playerServiceRef.current.play(url, { audioOnly, debug });
      if (audioOnly) {
        setIsPlayingAudio(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLaunching(false);
      if (!audioOnly) {
        exit();
        // Force exit to ensure terminal return even if detached processes exist
        setTimeout(() => process.exit(0), 100);
      }
    }
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" />{' '}
          {playlist ? 'Loading playlist...' : 'Checking activities...'}
        </Text>
      </Box>
    );
  }

  if (isPlaylistMode && isPlayingAudio && playerServiceRef.current) {
    return (
      <AudioPlayer
        service={playerServiceRef.current}
        title={`[${currentPlaylistIndex + 1}/${playlistItems.length}] ${currentTitle}`}
        color="magenta"
        symbol="🎵"
        onExit={() => {
          playerServiceRef.current?.stop();
          exit();
          setTimeout(() => process.exit(0), 100);
        }}
        onNext={handleNext}
        onPrev={handlePrev}
        onReload={handleReload}
      />
    );
  }

  if (activities.length === 0 && !playlist) {
    return (
      <Box padding={1}>
        <Text>No recent activities found.</Text>
      </Box>
    );
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedActivities = activities.slice(startIndex, endIndex);

  const items = paginatedActivities.map((activity) => ({
    label: `[${activity.author?.name}] ${activity.title} (${activity.timestamp.toLocaleDateString()})`,
    value: activity.url,
  }));

  if (endIndex < activities.length) {
    items.push({
      label: 'Next Page >>',
      value: 'next_page',
    });
  }

  if (page > 1) {
    items.push({
      label: '<< Previous Page',
      value: 'prev_page',
    });
  }

  if (isPlayingAudio && playerServiceRef.current) {
    return (
      <AudioPlayer
        service={playerServiceRef.current}
        title={currentTitle}
        color={disableColor ? undefined : currentColor}
        symbol={currentSymbol}
        onExit={() => {
          playerServiceRef.current?.stop();
          exit();
        }}
      />
    );
  }

  if (isLaunching) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" /> Launching player...
        </Text>
      </Box>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ItemComponent: React.FC<any> = ({ isSelected, label, value }) => {
    if (value === 'next_page' || value === 'prev_page') {
      return (
        <Text color={isSelected ? 'blue' : undefined}>
          {isSelected ? '> ' : '  '}
          {label}
        </Text>
      );
    }

    const activity = activities.find((a) => a.url === value);
    const authorColor = disableColor
      ? 'green'
      : activity?.author?.color || 'green';

    // Reconstruct label parts
    const match = label.match(/^\[(.*?)\] (.*)$/);
    if (match) {
      const [, authorName, content] = match;
      const symbol = activity?.author?.symbol
        ? `${activity.author.symbol} `
        : '';
      return (
        <Text>
          <Text color="blue">{isSelected ? '> ' : '  '}</Text>
          <Text color={authorColor}>
            [{symbol}
            {authorName}]{' '}
          </Text>
          <Text color={isSelected ? 'blue' : undefined}>{content}</Text>
        </Text>
      );
    }

    return (
      <Text color={isSelected ? 'blue' : undefined}>
        {isSelected ? '> ' : '  '}
        {label}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Recent Activities (Page {page})
      </Text>
      <Text dimColor>
        Select an activity to open in browser (or MPV if available). Press 'q' to exit.
      </Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={handleSelect}
          itemComponent={ItemComponent}
        />
      </Box>
    </Box>
  );
};

export default ActivityFeedScreen;
