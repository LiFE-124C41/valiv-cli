import React, { useState } from 'react';
import { Text } from 'ink';
import { ConfigRepository } from '../infrastructure/config-repository.js';
import { YouTubeService } from '../infrastructure/youtube-service.js';
import { CalendarService } from '../infrastructure/calendar-service.js';
import WelcomeScreen from './screens/Welcome.js';
import CreatorListScreen from './screens/CreatorList.js';
import ActivityFeedScreen from './screens/ActivityFeed.js';
import ScheduleListScreen from './screens/ScheduleList.js';
import AddCreatorScreen from './screens/AddCreator.js';
import RemoveCreator from './RemoveCreator.js';

interface AppProps {
  command: string;
  filterName?: string;
}

const App: React.FC<AppProps> = ({ command, filterName }) => {
  // Dependency Injection (Simple)
  const [configRepo] = useState(() => new ConfigRepository());
  const [youtubeService] = useState(() => new YouTubeService());
  const [calendarService] = useState(() => new CalendarService());

  switch (command) {
    case 'init':
      return <WelcomeScreen configRepo={configRepo} />;
    case 'add':
      return <AddCreatorScreen configRepo={configRepo} />;
    case 'remove':
      return <RemoveCreator />;
    case 'list':
      return <CreatorListScreen configRepo={configRepo} />;
    case 'check':
      return (
        <ActivityFeedScreen
          configRepo={configRepo}
          youtubeService={youtubeService}
          filterName={filterName}
        />
      );
    case 'schedule':
      return (
        <ScheduleListScreen
          configRepo={configRepo}
          calendarService={calendarService}
          filterName={filterName}
        />
      );
    default:
      return <Text>Unknown command</Text>;
  }
};

export default App;
