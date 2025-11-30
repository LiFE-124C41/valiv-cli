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
  filterName?: string;
  audioOnly?: boolean;
  debug?: boolean;
}

const ActivityFeedScreen: React.FC<ActivityFeedScreenProps> = ({
  configRepo,
  youtubeService,
  filterName,
  audioOnly,
  debug,
}) => {
  const { exit } = useApp();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const playerServiceRef = useRef<VideoPlayerService | null>(null);

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
      creators = filterCreators(creators, filterName);

      const results = await youtubeService.getActivities(creators);
      setActivities(results);
      setLoading(false);
    };

    fetchActivities();
  }, [configRepo, youtubeService, filterName]);

  const handleSelect = async (item: { value: string }) => {
    setIsLaunching(true);
    const url = item.value;
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

  const items = activities.map((activity) => ({
    label: `[${activity.author?.name}] ${activity.title} (${activity.timestamp.toLocaleDateString()})`,
    value: activity.url,
  }));

  if (isPlayingAudio && playerServiceRef.current) {
    return (
      <AudioPlayer
        service={playerServiceRef.current}
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
      <Text bold underline>Recent Activities</Text>
      <Text dimColor>Select an activity to open in browser (or MPV if available):</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};

export default ActivityFeedScreen;
