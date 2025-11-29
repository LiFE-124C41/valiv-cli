import React, { useEffect, useState } from 'react';
import { Text, Box, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { IConfigRepository } from '../../domain/interfaces.js';
import { VALIV_MEMBERS } from '../../domain/constants.js';
import { YouTubeService } from '../../infrastructure/youtube-service.js';
import { Creator } from '../../domain/models.js';

interface WelcomeScreenProps {
  configRepo: IConfigRepository;
  youtubeService: YouTubeService;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  configRepo,
  youtubeService,
}) => {
  const [loading, setLoading] = useState(true);
  const [updatedMembers, setUpdatedMembers] = useState<Creator[]>([]);

  useEffect(() => {
    const initializeMembers = async () => {
      const members = [...VALIV_MEMBERS];
      const updated = await Promise.all(
        members.map(async (member) => {
          if (member.youtubeChannelId) {
            const info = await youtubeService.getChannelInfo(
              member.youtubeChannelId,
            );
            if (info && info.title) {
              return { ...member, name: info.title };
            }
          }
          return member;
        }),
      );
      configRepo.saveCreators(updated);
      setUpdatedMembers(updated);
      setLoading(false);
    };

    initializeMembers();
  }, [configRepo, youtubeService]);

  useInput((input, key) => {
    if (!loading && key.return) {
      process.exit(0);
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" /> Initializing members...
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor="cyan"
    >
      <Text bold color="cyan">
        Welcome to valiv-cli!
      </Text>
      <Text>Your personal vα-liv activity tracker.</Text>
      <Box marginTop={1}>
        <Text>Initial members have been registered:</Text>
        <Box flexDirection="column" marginLeft={2}>
          {updatedMembers.map((m) => (
            <Text key={m.id} color="green">
              - {m.name}
            </Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text>
          Run <Text color="green">valiv add</Text> to add your favorite
          creators.
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter to exit</Text>
      </Box>
    </Box>
  );
};

export default WelcomeScreen;
