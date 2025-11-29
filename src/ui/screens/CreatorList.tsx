import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { IConfigRepository } from '../../domain/interfaces';
import { Creator } from '../../domain/models';

interface CreatorListScreenProps {
  configRepo: IConfigRepository;
}

const CreatorListScreen: React.FC<CreatorListScreenProps> = ({
  configRepo,
}) => {
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    setCreators(configRepo.getCreators());
  }, [configRepo]);

  if (creators.length === 0) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          No creators registered. Run 'valiv add' to add one.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Registered Creators
      </Text>
      <Box marginTop={1} flexDirection="column">
        {creators.map((creator) => (
          <Box key={creator.id}>
            <Text bold color="green">
              {creator.name}
            </Text>
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
