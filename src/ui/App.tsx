import React, { useState } from 'react';
import { Text } from 'ink';
import { ConfigRepository } from '../infrastructure/config-repository.js';
import { CacheRepository } from '../infrastructure/cache-repository.js';
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
  playlist?: string;
  debug?: boolean;
  detail?: boolean;
  interactive?: boolean;
  refresh?: boolean;
  week?: boolean;
  disableColor?: boolean;
}

type ScreenName = 'init' | 'add' | 'remove' | 'list' | 'check' | 'schedule';

const App: React.FC<AppProps> = ({
  command,
  filterId: initialFilterId,
  audioOnly,
  playlist,
  debug,
  detail,
  interactive,
  refresh,
  week,
  disableColor,
}) => {
  // Dependency Injection (Simple)
  const [configRepo] = useState(() => new ConfigRepository());
  const [cacheRepo] = useState(() => new CacheRepository());
  const [youtubeService] = useState(() => new YouTubeService(cacheRepo));
  const [calendarService] = useState(() => new CalendarService(cacheRepo));

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
          youtubeService={youtubeService}
          detail={detail}
          interactive={interactive}
          refresh={refresh}
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
          playlist={playlist}
          debug={debug}
          refresh={refresh}
          disableColor={disableColor}
        />
      );
    case 'schedule':
      return (
        <ScheduleListScreen
          configRepo={configRepo}
          calendarService={calendarService}
          filterId={screenProps.filterId}
          refresh={refresh}
          week={week}
          disableColor={disableColor}
        />
      );
    default:
      return <Text>Unknown command</Text>;
  }
};

export default App;
