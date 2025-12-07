import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { IConfigRepository } from '../../domain/interfaces.js';
import { Creator } from '../../domain/models.js';
import { YouTubeService } from '../../infrastructure/youtube-service.js';

interface AddCreatorScreenProps {
  configRepo: IConfigRepository;
  youtubeService: YouTubeService;
}

const AddCreatorScreen: React.FC<AddCreatorScreenProps> = ({
  configRepo,
  youtubeService,
}) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [completed, setCompleted] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchedName, setFetchedName] = useState('');

  const handleYoutubeIdSubmit = async () => {
    if (!youtubeId) {
      setStep(2);
      return;
    }

    setFetching(true);
    const info = await youtubeService.getChannelInfo(youtubeId);
    setFetching(false);

    if (info && info.title) {
      setFetchedName(info.title);
      setStep(1.5); // Confirmation step
    } else {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    const newCreator: Creator = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      youtubeChannelId: youtubeId || undefined,
      calendarUrl: calendarUrl || undefined,
    };
    configRepo.saveCreator(newCreator);
    setCompleted(true);
  };

  useInput((input, key) => {
    if (completed && key.return) {
      process.exit(0);
    }

    if (step === 1.5) {
      if (input.toLowerCase() === 'y' || key.return) {
        setName(fetchedName);
        setStep(2);
      } else if (input.toLowerCase() === 'n') {
        setStep(2);
      }
    }
  });

  if (completed) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="green">Creator '{name}' added successfully!</Text>
        <Text dimColor>Press Enter to exit</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Add New Creator</Text>

      <Box marginTop={1}>
        <Text>Name: </Text>
        {step === 0 ? (
          <TextInput
            value={name}
            onChange={setName}
            onSubmit={() => setStep(1)}
          />
        ) : (
          <Text color="green">{name}</Text>
        )}
      </Box>

      {step >= 1 && (
        <Box flexDirection="column">
          <Box>
            <Text>YouTube Channel ID (optional): </Text>
            {step === 1 ? (
              <TextInput
                value={youtubeId}
                onChange={setYoutubeId}
                onSubmit={handleYoutubeIdSubmit}
              />
            ) : (
              <Text color="green">{youtubeId}</Text>
            )}
          </Box>
          {fetching && (
            <Text color="yellow">
              <Spinner type="dots" /> Fetching channel info...
            </Text>
          )}
          {step === 1.5 && (
            <Box flexDirection="column" marginTop={1}>
              <Text>
                Found channel name:{' '}
                <Text bold color="cyan">
                  {fetchedName}
                </Text>
              </Text>
              <Text>Update name to this? (Y/n)</Text>
            </Box>
          )}
        </Box>
      )}

      {step >= 2 && (
        <Box>
          <Text>Calendar URL (optional): </Text>
          {step === 2 ? (
            <TextInput
              value={calendarUrl}
              onChange={setCalendarUrl}
              onSubmit={handleSubmit}
            />
          ) : (
            <Text color="green">{calendarUrl}</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AddCreatorScreen;
