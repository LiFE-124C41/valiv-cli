import React, { useEffect, useState } from 'react';
import { Text, Box, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { IConfigRepository } from '../../domain/interfaces.js';
import { Creator } from '../../domain/models.js';
import { YouTubeService } from '../../infrastructure/youtube-service.js';
import open from 'open';

interface CreatorListScreenProps {
  configRepo: IConfigRepository;
  youtubeService: YouTubeService;
  detail?: boolean;
  interactive?: boolean;
  onNavigate?: (screen: 'check', props: { filterId?: string }) => void;
  disableColor?: boolean;
  refresh?: boolean;
}

type ViewState = 'list' | 'actions';

const CreatorListScreen: React.FC<CreatorListScreenProps> = ({
  configRepo,
  youtubeService,
  detail,
  interactive,
  onNavigate,
  disableColor,
  refresh,
}) => {
  const { exit } = useApp();
  const [creators, setCreators] = useState<Creator[]>(() =>
    configRepo.getCreators(),
  );
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [subscriberCounts, setSubscriberCounts] = useState<
    Record<string, string>
  >({});

  // Initial loading state depends on whether we have a token
  const [loading, setLoading] = useState(() => !!configRepo.getYoutubeApiToken());

  useEffect(() => {
    const fetchSubscribers = async () => {
      const token = configRepo.getYoutubeApiToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Collect all channel IDs
        const channelIds = creators
          .map((c) => c.youtubeChannelId)
          .filter((id): id is string => !!id);

        if (channelIds.length === 0) {
          setLoading(false);
          return;
        }

        const counts = await youtubeService.getSubscriberCounts(
          channelIds,
          token,
          refresh,
        );

        // Format numbers
        const formattedCounts: Record<string, string> = {};
        for (const [id, count] of Object.entries(counts)) {
          // Map back to creator IDs using channel ID
          const creator = creators.find(c => c.youtubeChannelId === id);
          if (creator) {
            formattedCounts[creator.id] = abbreviateNumber(parseInt(count, 10));
          }
        }

        setSubscriberCounts(formattedCounts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscribers();
  }, [configRepo, youtubeService, creators, refresh]);

  useEffect(() => {
    if (!interactive && !loading) {
      exit();
    }
  }, [interactive, loading, exit]);

  useInput((input) => {
    if (interactive && viewState === 'list' && input === 'q') {
      exit();
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" /> Updating subscriber counts...
        </Text>
      </Box>
    );
  }

  if (creators.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          No creators registered. Run 'valiv add' to add one.
        </Text>
      </Box>
    );
  }

  const handleSelectCreator = (item: { label: string; value: string }) => {
    const creator = creators.find((c) => c.id === item.value);
    if (creator) {
      setSelectedCreator(creator);
      setViewState('actions');
    }
  };

  const handleSelectAction = async (item: { label: string; value: string }) => {
    if (!selectedCreator) return;

    switch (item.value) {
      case 'check':
        if (onNavigate) {
          onNavigate('check', { filterId: selectedCreator.name });
        } else {
          console.log('Navigation not available');
        }
        break;
      case 'open_youtube':
        if (selectedCreator.youtubeChannelId) {
          await open(
            `https://www.youtube.com/channel/${selectedCreator.youtubeChannelId}`,
          );
        }
        break;
      case 'open_x':
        if (selectedCreator.xUsername) {
          await open(`https://x.com/${selectedCreator.xUsername}`);
        }
        break;
      case 'remove':
        configRepo.removeCreator(selectedCreator.id);
        setCreators(configRepo.getCreators());
        setViewState('list');
        break;
      case 'back':
        setViewState('list');
        break;
    }
  };

  if (interactive) {
    if (viewState === 'list') {
      const items = creators.map((c) => ({
        label:
          c.name +
          (subscriberCounts[c.id] ? ` [${subscriberCounts[c.id]}]` : ''),
        value: c.id,
      }));

      return (
        <Box flexDirection="column" padding={1}>
          <Text bold underline>
            Select a Creator
          </Text>
          <Box marginTop={1}>
            <SelectInput items={items} onSelect={handleSelectCreator} />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press 'q' to exit</Text>
          </Box>
        </Box>
      );
    }

    if (viewState === 'actions' && selectedCreator) {
      const actions = [
        { label: 'Check Activity', value: 'check' },
        ...(selectedCreator.youtubeChannelId
          ? [{ label: 'Open YouTube', value: 'open_youtube' }]
          : []),
        ...(selectedCreator.xUsername
          ? [{ label: 'Open X', value: 'open_x' }]
          : []),
        { label: 'Remove', value: 'remove' },
        { label: 'Back', value: 'back' },
      ];

      return (
        <Box flexDirection="column" padding={1}>
          <Text bold underline>
            Actions for {selectedCreator.name}
          </Text>
          <Box marginTop={1}>
            <SelectInput items={actions} onSelect={handleSelectAction} />
          </Box>
        </Box>
      );
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Registered Creators
      </Text>
      <Box marginTop={1} flexDirection="column">
        {detail
          ? // Detailed View
          creators.map((creator) => (
            <Box key={creator.id} flexDirection="column" marginBottom={1}>
              <Text
                bold
                color={disableColor ? 'green' : creator.color || 'green'}
              >
                {creator.symbol ? `${creator.symbol} ` : ''}
                {creator.name}
                {subscriberCounts[creator.id] && (
                  <Text color="yellow">
                    {' '}
                    ({subscriberCounts[creator.id]} Subs)
                  </Text>
                )}
              </Text>
              <Box marginLeft={2} flexDirection="column">
                <Text>ID: {creator.id}</Text>
                {creator.youtubeChannelId && (
                  <Text>YouTube: {creator.youtubeChannelId}</Text>
                )}
                {creator.twitchChannelId && (
                  <Text>Twitch: {creator.twitchChannelId}</Text>
                )}
                {creator.xUsername && <Text>X: @{creator.xUsername}</Text>}
                {creator.calendarUrl && <Text>Calendar: Registered</Text>}
              </Box>
            </Box>
          ))
          : // Simple View
          creators.map((creator) => (
            <Box key={creator.id}>
              <Text
                bold
                color={disableColor ? 'green' : creator.color || 'green'}
              >
                {creator.symbol ? `${creator.symbol} ` : ''}
                {creator.name}
              </Text>
              {subscriberCounts[creator.id] && (
                <Text color="yellow"> [{subscriberCounts[creator.id]}]</Text>
              )}
              <Text> - </Text>
              <Text dimColor>
                {creator.youtubeChannelId ? 'YT ' : ''}
                {creator.calendarUrl ? 'Cal ' : ''}
              </Text>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

// Helper for formatting large numbers
function abbreviateNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

export default CreatorListScreen;
