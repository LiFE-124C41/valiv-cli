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
  filterId?: string;
  audioOnly?: boolean;
  debug?: boolean;
  detail?: boolean;
  interactive?: boolean;
  disableColor?: boolean;
}

type ScreenName = 'init' | 'add' | 'remove' | 'list' | 'check' | 'schedule';

const App: React.FC<AppProps> = ({
  command,
  filterId: initialFilterId,
  audioOnly,
  debug,
  detail,
  interactive,
  disableColor,
}) => {
  // Dependency Injection (Simple)
  const [configRepo] = useState(() => new ConfigRepository());
  const [youtubeService] = useState(() => new YouTubeService());
  const [calendarService] = useState(() => new CalendarService());

  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(
    command as ScreenName,
  );
  const [screenProps, setScreenProps] = useState<{ filterId?: string }>({
    filterId: initialFilterId,
  });

  const navigate = (screen: ScreenName, props: { filterId?: string } = {}) => {
    setCurrentScreen(screen);
    setScreenProps(props);
  };

  switch (currentScreen) {
    case 'init':
      return (
        <WelcomeScreen
          configRepo={configRepo}
          youtubeService={youtubeService}
        />
      );
    case 'add':
      return (
        <AddCreatorScreen
          configRepo={configRepo}
          youtubeService={youtubeService}
        />
      );
    case 'remove':
      return <RemoveCreator />;
    case 'list':
      return (
        <CreatorListScreen
          configRepo={configRepo}
          detail={detail}
          interactive={interactive}
          onNavigate={navigate}
          disableColor={disableColor}
        />
      );
    case 'check':
      return (
        <ActivityFeedScreen
          configRepo={configRepo}
          youtubeService={youtubeService}
          filterId={screenProps.filterId}
          audioOnly={audioOnly}
          debug={debug}
          disableColor={disableColor}
        />
      );
    case 'schedule':
      return (
        <ScheduleListScreen
          configRepo={configRepo}
          calendarService={calendarService}
          filterId={screenProps.filterId}
          disableColor={disableColor}
        />
      );
    default:
      return <Text>Unknown command</Text>;
  }
};

export default App;
