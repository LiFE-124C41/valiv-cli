import React, { useState } from 'react';
import { Text, useInput, useApp } from 'ink';
import { ConfigRepository } from '../infrastructure/config-repository.js';
import { CacheRepository } from '../infrastructure/cache-repository.js';
import { YouTubeService } from '../infrastructure/youtube-service.js';
import { CalendarService } from '../infrastructure/calendar-service.js';
import { SpreadsheetService } from '../infrastructure/spreadsheet-service.js';
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
  clean?: boolean;
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
  clean,
}) => {
  // Dependency Injection (Simple)
  const [configRepo] = useState(() => new ConfigRepository());
  const [cacheRepo] = useState(() => new CacheRepository());
  const [youtubeService] = useState(() => new YouTubeService(cacheRepo));
  const [calendarService] = useState(
    () => new CalendarService(cacheRepo, configRepo, youtubeService),
  );
  const [spreadsheetService] = useState(
    () => new SpreadsheetService(cacheRepo),
  );

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

  // Clean Logic State
  const [cleanConfirmed, setCleanConfirmed] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const { exit } = useApp();

  useInput((input, key) => {
    if (command === 'init' && clean && !cleanConfirmed && !isCleaning) {
      if (input === 'y' || input === 'Y') {
        setCleanConfirmed(true);
        performClean();
      } else if (input === 'n' || input === 'N' || key.escape) {
        exit();
      }
    }
  });

  const performClean = async () => {
    setIsCleaning(true);
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const configPath = configRepo.getPath();
      const cachePath = cacheRepo.getPath();

      const configDir = path.dirname(configPath);
      const cacheDir = path.dirname(cachePath);

      // Explicit paths requested by user
      const appData = process.env.APPDATA || process.env.HOME || '';
      const explicitNodeJsConfig = path.join(appData, 'valiv-cli-nodejs');
      const explicitNodeJsCache = path.join(appData, 'valiv-cli-cache-nodejs');

      const pathsToDelete = [
        configDir,
        cacheDir,
        explicitNodeJsConfig,
        explicitNodeJsCache,
      ];

      // Deduplicate paths
      const uniquePaths = [...new Set(pathsToDelete)];

      for (const p of uniquePaths) {
        try {
          await fs.rm(p, { recursive: true, force: true });
        } catch {
          // Ignore errors if path doesn't exist
        }
      }

      // Re-initialize repositories after cleaning to ensure fresh state if we were to continue (though we force exit or strictly init)
      // Actually, since we deleted the files, the current instances in memory are "stale" but they are just wrappers around 'conf'.
      // 'conf' might hold onto values in memory.
      // Since 'init' screen creates fresh setup usually, it should be fine.

      setIsCleaning(false);
    } catch (e) {
      setCleanError(e instanceof Error ? e.message : 'Unknown error');
      setIsCleaning(false);
    }
  };

  if (command === 'init' && clean && !cleanConfirmed) {
    return (
      <Text>
        <Text color="red" bold>
          WARNING: You are about to delete all valiv-cli configuration and cache
          data.
        </Text>
        {'\n'}
        <Text>
          This includes all registered creators and your YouTube API token.
        </Text>
        {'\n'}
        <Text bold>Are you sure you want to proceed? (y/N): </Text>
      </Text>
    );
  }

  if (command === 'init' && clean && isCleaning) {
    return <Text color="yellow">Cleaning up...</Text>;
  }

  if (command === 'init' && clean && cleanError) {
    return <Text color="red">Error cleaning up: {cleanError}</Text>;
  }

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
          spreadsheetService={spreadsheetService}
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
