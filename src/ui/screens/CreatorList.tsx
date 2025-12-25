import React, { useEffect, useState } from 'react';
import { Text, Box, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { IConfigRepository } from '../../domain/interfaces.js';
import { Creator, CreatorStatistics } from '../../domain/models.js';
import { SpreadsheetService } from '../../infrastructure/spreadsheet-service.js';
import { formatSubscriberCount } from '../../utils/stringUtils.js';
import open from 'open';

interface CreatorListScreenProps {
  configRepo: IConfigRepository;
  spreadsheetService: SpreadsheetService;
  detail?: boolean;
  interactive?: boolean;
  onNavigate?: (screen: 'check', props: { filterId?: string }) => void;
  disableColor?: boolean;
  refresh?: boolean;
}

type ViewState = 'list' | 'actions';

interface GrowthIndicatorProps {
  value?: number;
}

const GrowthIndicator: React.FC<GrowthIndicatorProps> = ({ value }) => {
  if (value === undefined || value === 0) return null;

  const isPositive = value > 0;
  const color = isPositive ? 'green' : 'red';
  const prefix = isPositive ? '+' : '';

  return (
    <Text color={color}>
      {' '}
      ({prefix}
      {value.toLocaleString()})
    </Text>
  );
};

const CreatorListScreen: React.FC<CreatorListScreenProps> = ({
  configRepo,
  spreadsheetService,
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

  const [channelStats, setChannelStats] = useState<
    Record<string, CreatorStatistics>
  >({});

  // Initial loading state depends on whether we have a spreadsheet ID
  const [loading, setLoading] = useState(
    () => !!configRepo.getGoogleSpreadsheetId(),
  );

  useEffect(() => {
    const fetchStats = async () => {
      const spreadsheetId = configRepo.getGoogleSpreadsheetId();
      if (!spreadsheetId) {
        setLoading(false);
        return;
      }

      try {
        const stats = await spreadsheetService.getStatistics(
          spreadsheetId,
          creators,
          refresh,
        );
        setChannelStats(stats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [configRepo, spreadsheetService, creators, refresh]);

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
          (channelStats[c.id]
            ? ` [${formatSubscriberCount(channelStats[c.id].subscriberCount, detail)}]`
            : ''),
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
              </Text>

              {channelStats[creator.id] && (
                <Box marginLeft={2} flexDirection="column" marginBottom={1}>
                  <Text>
                    👥 Subscribers:{' '}
                    {formatSubscriberCount(
                      channelStats[creator.id].subscriberCount,
                      true,
                    )}
                    <GrowthIndicator
                      value={channelStats[creator.id].subscriberGrowth}
                    />
                  </Text>
                  <Text>
                    👀 Views:{' '}
                    {formatSubscriberCount(
                      channelStats[creator.id].viewCount,
                      true,
                    )}
                    <GrowthIndicator
                      value={channelStats[creator.id].viewGrowth}
                    />
                  </Text>
                  <Text>
                    📺 Videos:{' '}
                    {formatSubscriberCount(
                      channelStats[creator.id].videoCount,
                      true,
                    )}
                    <GrowthIndicator
                      value={channelStats[creator.id].videoGrowth}
                    />
                  </Text>
                </Box>
              )}
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
              {channelStats[creator.id] && (
                <Text color="yellow">
                  {' '}
                  [
                  {formatSubscriberCount(
                    channelStats[creator.id].subscriberCount,
                    false,
                  )}
                  ]
                  <GrowthIndicator
                    value={channelStats[creator.id].subscriberGrowth}
                  />
                </Text>
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

export default CreatorListScreen;
