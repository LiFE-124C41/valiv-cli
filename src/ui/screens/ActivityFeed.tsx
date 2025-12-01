import React, { useEffect, useState, useRef } from 'react';
import { Text, Box, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import {
  IConfigRepository,
  IActivityService,
} from '../../domain/interfaces.js';
import { Activity, Creator } from '../../domain/models.js';
import { VideoPlayerService } from '../../infrastructure/video-player-service.js';
import { AudioPlayer } from '../components/AudioPlayer.js';
import { filterCreators } from '../../utils/filter.js';

interface ActivityFeedScreenProps {
  configRepo: IConfigRepository;
  youtubeService: IActivityService;
  filterId?: string;
  audioOnly?: boolean;
  debug?: boolean;
}

const ActivityFeedScreen: React.FC<ActivityFeedScreenProps> = ({
  configRepo,
  youtubeService,
  filterId,
  audioOnly,
  debug,
}) => {
  const { exit } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [page, setPage] = useState(1);
  const playerServiceRef = useRef<VideoPlayerService | null>(null);

  const ITEMS_PER_PAGE = 10;

  useInput((input) => {
    if (isPlayingAudio && input === 'q') {
      if (playerServiceRef.current) {
        playerServiceRef.current.stop();
      }
      exit();
      setTimeout(() => process.exit(0), 100);
    }
  });

  useEffect(() => {
    const fetchActivities = async () => {
      let creators = configRepo.getCreators();
      creators = filterCreators(creators, filterId);

      const results = await youtubeService.getActivities(creators);
      setActivities(results);
      setLoading(false);
    };

    fetchActivities();
  }, [configRepo, youtubeService, filterId]);

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

    const selectedActivity = activities.find(a => a.url === url);
    if (selectedActivity) {
      setCurrentTitle(selectedActivity.title);
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
          <Spinner type="dots" /> Checking activities...
        </Text>
      </Box>
    );
  }

  if (activities.length === 0) {
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

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>Recent Activities (Page {page})</Text>
      <Text dimColor>Select an activity to open in browser (or MPV if available):</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};

export default ActivityFeedScreen;
