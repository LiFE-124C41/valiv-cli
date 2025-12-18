import React, { useEffect, useState } from 'react';
import { Text, Box, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { IConfigRepository } from '../../domain/interfaces.js';
import { VALIV_MEMBERS } from '../../domain/constants.js';
import { YouTubeService } from '../../infrastructure/youtube-service.js';

const getWelcomeMessage = () => {
  const art =
    'CiByJG9JICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogIHQkIyEgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgfEBXQ0ohIGBsbGxsbGxsbGwhSmRkZHpsbCFDZGRkZGRwXWxsbDFkZGRxK2xsbGxsbCFKZGRkemxsbGxsbF4gICAgICAgIGlfICAsWUNDQ34gICAgICAgICAgIC4vQ0NDai4gCiAgICAxQCQkVz4gICAgICd9MTEpbSQkJHdeICdDJCQkJCQkJE1pIF84JCRCXSAgICAgICAgLGskQHc/ICAgICAgICAgICAgIDwmQl0gID8lJCQlLSAgICAgICAgIC51JCQkaDogIAogICAgIH1CJCQmfiAgICAgICAnTCQkJFpgICdRJCQkd3V6QCQkJnUlJCQ4LSAgIjo6Ojo6LiAiZCQmJmIxe3t7bCAgICAgICdvJCQ4LCAgKzgkJEJdICAgICAgIC5jJCQkZCIgICAKICAgICAgPyUkJDhfICAgICBgTyQkJDAnIGBaJCQkUScgIF1CJCQkJCQmfiAge0AkJCQkJEouIF5xJCQkVS4gICAgICAgICAgaU0lLSAnICA8JiQkQnsgICAgIC5VJCQkcV4gICAgCiAgICAgICBfOCQkJT8gICBgbSQkJEMnIF53JCQkVS4gICAgLSUkJCQmPiAgKEAkJCQkJCQkTCcgYFokJCRDJyAgICAgICAgICAhfiAsZFwgIGlNJCRAKSAgICdcTExMTHtbW14gIAogICF7e3t7eyhZTExDWyAicSQkJFkuIGBwJCQkVS4gICAgIChAJCQkQlsgIGBgYGBgYGBgYGAuICAnMCQkJDAnICAgICAgICAgICA6aCQkZiAgbCMkJCRcICcwJCQkMCJgYGAuICAKICAgICAgICAgPlckJEBcYiQkJGMuICAgciQkJGF+aWlpaWYkJCQkJCRAKGlpaWlpaWlpLiAgICAgICdDJCQkWj5paWk6ICAgICAgOmEkJCR4LiBJbyQkJHJaJCQkTCcgICAgICAgCiAgICAgICAgICAhIyQkJCQkJG4uICAgJzpqTExMOCQkJCQkJCRhP00kJCQkJE1MTCg/fiAgICAgICAgLlUkJCQkJCQkJkpKSkpqLiAsayQkJHYuIDtoJCQkJCQka11JICAgICAgIAogICAgICAgICAgIElvQEBAQGogICAgICdfLWZCQEBAQEBAQEBrLCBsKkBAQEAleywuICAnJycnJycsKSkoMCQkJCQkJCQkJCQkJFlgJyxkJCQkWCcnO2gkJCQkWTo6IicnJycnJyAKICAgICAgICAgICAgLi4uLi4gICAgICAgICAgLi4uLi4uLi4uLiAgIC4uLi4uLiAgICAgLElJPnt+SUk8K2koKD9JMSl+SUk+LUlpe19JbHckJCRaSUlJSUlJSUlJSUlJSUlJSTsgCg==';
  return Buffer.from(art, 'base64').toString('utf-8');
};

interface WelcomeScreenProps {
  configRepo: IConfigRepository;
  youtubeService: YouTubeService;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  configRepo,
  youtubeService,
}) => {
  const [loading, setLoading] = useState(true);
  const [updatedMembers, setUpdatedMembers] = useState<typeof VALIV_MEMBERS>(
    [],
  );
  const [step, setStep] = useState<'init' | 'token' | 'done'>('init');
  const [tokenInput, setTokenInput] = useState('');
  const tokenInputRef = React.useRef(tokenInput);

  useEffect(() => {
    tokenInputRef.current = tokenInput;
  }, [tokenInput]);

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
      setStep('token'); // Move to token input step
    };

    if (step === 'init') {
      initializeMembers();
    }
  }, [configRepo, youtubeService, step]);

  useInput((input, key) => {
    if (loading) return;

    if (step === 'token') {
      if (key.return) {
        const currentInput = tokenInputRef.current;
        if (currentInput.trim().length > 0) {
          configRepo.saveYoutubeApiToken(currentInput.trim());
        }
        setStep('done');
      } else if (key.backspace || key.delete) {
        setTokenInput((prev) => prev.slice(0, -1));
      } else if (input.length > 0) {
        // Naive input handling, sufficient for basic CLI
        setTokenInput((prev) => prev + input);
      }
    } else if (step === 'done' && key.return) {
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

  if (step === 'token') {
    return (
      <Box
        flexDirection="column"
        padding={1}
        borderStyle="round"
        borderColor="cyan"
      >
        <Text bold color="cyan">
          Setup YouTube API Token (Optional)
        </Text>
        <Box marginY={1}>
          <Text>
            To view subscriber counts, please enter your YouTube Data API v3
            Key.
          </Text>
          <Text dimColor>(Press Enter to skip)</Text>
        </Box>
        <Box>
          <Text>API Key: </Text>
          <Text color="green">{tokenInput}</Text>
          <Text dimColor>|</Text>
        </Box>
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
      <Box marginY={1}>
        <Text color="#656A75">{getWelcomeMessage()}</Text>
      </Box>
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
          {tokenInput
            ? 'YouTube API Token configured!'
            : 'YouTube API Token skipped.'}
        </Text>
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
