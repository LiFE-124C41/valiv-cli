import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { IConfigRepository } from '../../domain/interfaces';
import { Creator } from '../../domain/models';

interface AddCreatorScreenProps {
  configRepo: IConfigRepository;
}

const AddCreatorScreen: React.FC<AddCreatorScreenProps> = ({ configRepo }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [calendarUrl, setCalendarUrl] = useState('');
  const [completed, setCompleted] = useState(false);

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
        <Box>
          <Text>YouTube Channel ID (optional): </Text>
          {step === 1 ? (
            <TextInput
              value={youtubeId}
              onChange={setYoutubeId}
              onSubmit={() => setStep(2)}
            />
          ) : (
            <Text color="green">{youtubeId}</Text>
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
