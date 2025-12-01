import React, { useEffect, useState } from 'react';
import { Text, Box, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { IConfigRepository } from '../../domain/interfaces.js';
import { Creator } from '../../domain/models.js';
import open from 'open';

interface CreatorListScreenProps {
  configRepo: IConfigRepository;
  detail?: boolean;
  interactive?: boolean;
  onNavigate?: (screen: 'check', props: { filterId?: string }) => void;
  disableColor?: boolean;
}

type ViewState = 'list' | 'actions';

const CreatorListScreen: React.FC<CreatorListScreenProps> = ({
  configRepo,
  detail,
  interactive,
  onNavigate,
  disableColor,
}) => {
  const { exit } = useApp();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [viewState, setViewState] = useState<ViewState>('list');
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);

  useEffect(() => {
    setCreators(configRepo.getCreators());
  }, [configRepo]);

  useInput((input, key) => {
    if (interactive && viewState === 'list' && key.escape) {
      exit();
    }
  });

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
        label: c.name,
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
            <Text dimColor>Press Esc to exit</Text>
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
        {detail ? (
          // Detailed View
          creators.map((creator) => (
            <Box key={creator.id} flexDirection="column" marginBottom={1}>
              <Text bold color={disableColor ? 'green' : (creator.color || 'green')}>
                {creator.name}
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
        ) : (
          // Simple View
          creators.map((creator) => (
            <Box key={creator.id}>
              <Text bold color={disableColor ? 'green' : (creator.color || 'green')}>
                {creator.name}
              </Text>
              <Text> - </Text>
              <Text dimColor>
                {creator.youtubeChannelId ? 'YT ' : ''}
                {creator.calendarUrl ? 'Cal ' : ''}
              </Text>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default CreatorListScreen;
