import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { IConfigRepository, IActivityService } from '../../domain/interfaces';
import { Activity } from '../../domain/models';

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
                creators = creators.filter((c) =>
                    c.name.toLowerCase().includes(filterName.toLowerCase()),
                );
            }

            const results = await youtubeService.getActivities(creators);
            setActivities(results);
            setLoading(false);
        };

        fetchActivities();
    }, [configRepo, youtubeService, filterName]);

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

    return (
        <Box flexDirection="column" padding={1}>
            <Text bold underline>Recent Activities</Text>
            <Box marginTop={1} flexDirection="column">
                {activities.map((activity) => (
                    <Box key={activity.id} marginBottom={1} flexDirection="column">
                        <Text bold color="cyan">
                            [{activity.author?.name}] {activity.title}
                        </Text>
                        <Text dimColor>{activity.timestamp.toLocaleString()}</Text>
                        <Text color="blue">{activity.url}</Text>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ActivityFeedScreen;
