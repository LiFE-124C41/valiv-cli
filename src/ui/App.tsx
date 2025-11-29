import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import { ConfigRepository } from '../infrastructure/config-repository';
import { YouTubeService } from '../infrastructure/youtube-service';
import { CalendarService } from '../infrastructure/calendar-service';
import WelcomeScreen from './screens/Welcome';
import CreatorListScreen from './screens/CreatorList';
import ActivityFeedScreen from './screens/ActivityFeed';
import ScheduleListScreen from './screens/ScheduleList';
import AddCreatorScreen from './screens/AddCreator';

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
