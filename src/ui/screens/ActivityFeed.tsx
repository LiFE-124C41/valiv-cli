import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import SelectInput from 'ink-select-input';
import {
  IConfigRepository,
  IActivityService,
} from '../../domain/interfaces.js';
import { Activity, Creator } from '../../domain/models.js';

interface ActivityFeedScreenProps {
  configRepo: IConfigRepository;
  youtubeService: IActivityService;
  filterName?: string;
}

const ActivityFeedScreen: React.FC<ActivityFeedScreenProps> = ({
  configRepo,
  youtubeService,
  filterName,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      let creators = configRepo.getCreators();
      if (filterName) {
        creators = creators.filter((c: Creator) =>
          c.name.toLowerCase().includes(filterName.toLowerCase()),
        );
      }

      const results = await youtubeService.getActivities(creators);
      setActivities(results);
      setLoading(false);
    };

    fetchActivities();
  }, [configRepo, youtubeService, filterName]);

  const handleSelect = (item: { value: string }) => {
    const url = item.value;
    const command =
      process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;

    import('child_process').then(({ exec }) => {
      exec(command, (error) => {
        if (error) {
          // console.error(`Failed to open URL: ${error.message}`);
        }
      });
    });
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

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Recent Activities
      </Text>
      <Text dimColor>Select an activity to open in browser:</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={handleSelect} />
      </Box>
    </Box>
  );
};

export default ActivityFeedScreen;
