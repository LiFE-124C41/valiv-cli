import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import Spinner from 'ink-spinner';
import { formatDistanceToNow } from 'date-fns';
import { IConfigRepository, IScheduleService } from '../../domain/interfaces.js';
import { ScheduleEvent, Creator } from '../../domain/models.js';

interface ScheduleListScreenProps {
    configRepo: IConfigRepository;
    calendarService: IScheduleService;
    filterName?: string;
}

const ScheduleListScreen: React.FC<ScheduleListScreenProps> = ({
    configRepo,
    calendarService,
    filterName,
}) => {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedules = async () => {
            let creators = configRepo.getCreators();
            if (filterName) {
                creators = creators.filter((c: Creator) =>
                    c.name.toLowerCase().includes(filterName.toLowerCase()),
                );
            }

            const results = await calendarService.getSchedules(creators);
            setEvents(results);
            setLoading(false);
        };

        fetchSchedules();
    }, [configRepo, calendarService, filterName]);

    if (loading) {
        return (
            <Box padding={1}>
                <Text color="green">
                    <Spinner type="dots" /> Fetching schedules...
                </Text>
            </Box>
        );
    }

    if (events.length === 0) {
        return (
            <Box padding={1}>
                <Text>No upcoming schedules found.</Text>
            </Box>
        );
    }

    // Group events by date
    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = event.startTime.toLocaleDateString();
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, ScheduleEvent[]>);

    return (
        <Box flexDirection="column" padding={1}>
            <Text bold underline>Upcoming Schedules</Text>
            {Object.entries(groupedEvents).map(([date, dateEvents]: [string, ScheduleEvent[]]) => (
                <Box key={date} flexDirection="column" marginTop={1}>
                    <Text bold color="cyan">{date}</Text>
                    {dateEvents.map((event) => (
                        <Box key={event.id} flexDirection="column" marginLeft={2} marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
                            <Box>
                                <Text bold color="yellow">{event.title}</Text>
                            </Box>
                            <Box>
                                <Text>
                                    {event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {event.endTime ? ` - ${event.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                    <Text dimColor> ({formatDistanceToNow(event.startTime, { addSuffix: true })})</Text>
                                </Text>
                            </Box>
                            {event.description && (
                                <Box marginTop={0}>
                                    <Text dimColor>{event.description.length > 100 ? event.description.substring(0, 100) + '...' : event.description}</Text>
                                </Box>
                            )}
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>
    );
};

export default ScheduleListScreen;
