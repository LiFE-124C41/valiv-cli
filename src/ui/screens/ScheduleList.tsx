import React, { useEffect, useState } from 'react';
import { Text, Box, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { formatDistanceToNow } from 'date-fns';
import {
  IConfigRepository,
  IScheduleService,
} from '../../domain/interfaces.js';
import { ScheduleEvent } from '../../domain/models.js';
import { filterCreators } from '../../utils/filter.js';
import WeeklyScheduleView from '../components/WeeklyScheduleView.js';

interface ScheduleListScreenProps {
  configRepo: IConfigRepository;
  calendarService: IScheduleService;
  filterId?: string;
  refresh?: boolean;
  week?: boolean;
  disableColor?: boolean;
}

const ScheduleListScreen: React.FC<ScheduleListScreenProps> = ({
  configRepo,
  calendarService,
  filterId,
  refresh,
  week,
  disableColor,
}) => {
  const { exit } = useApp();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  // Derived state
  const liveEvents = events.filter((e) => e.status === 'live');
  const upcomingEvents = events.filter((e) => e.status !== 'live');

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      setTimeout(() => process.exit(0), 100);
    }

    if (key.rightArrow) {
      const totalPages = Math.ceil(upcomingEvents.length / ITEMS_PER_PAGE);
      if (page < totalPages) {
        setPage((p) => p + 1);
      }
    }

    if (key.leftArrow) {
      if (page > 1) {
        setPage((p) => p - 1);
      }
    }
  });

  useEffect(() => {
    const fetchSchedules = async () => {
      const allCreators = configRepo.getCreators();
      const targetCreators = filterCreators(allCreators, filterId);

      const allSchedules = await calendarService.getSchedules(
        allCreators,
        refresh,
      );

      const results = allSchedules.filter((event) =>
        targetCreators.some((c) => c.id === event.author?.id),
      );
      setEvents(results);
      setLoading(false);
    };

    fetchSchedules();
  }, [configRepo, calendarService, filterId, refresh]);

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="green">
          <Spinner type="dots" /> Fetching schedules...
        </Text>
      </Box>
    );
  }

  if (week) {
    return <WeeklyScheduleView events={events} disableColor={disableColor} />;
  }

  if (events.length === 0) {
    return (
      <Box padding={1}>
        <Text>No upcoming schedules found.</Text>
      </Box>
    );
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEvents = upcomingEvents.slice(startIndex, endIndex);
  const totalPages = Math.ceil(upcomingEvents.length / ITEMS_PER_PAGE);

  // Group events by date
  const groupedEvents = paginatedEvents.reduce(
    (acc, event) => {
      const dateKey = event.startTime.toLocaleDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, ScheduleEvent[]>,
  );

  return (
    <Box flexDirection="column" padding={1}>
      {/* Live Section */}
      {liveEvents.length > 0 && (
        <Box
          flexDirection="column"
          marginBottom={1}
          borderStyle="round"
          borderColor="red"
          paddingX={1}
        >
          <Text bold color="red">
            🔴 Now Streaming
          </Text>
          {liveEvents.map((event) => (
            <Box key={event.id} flexDirection="column" marginTop={0}>
              <Box flexDirection="row">
                <Text bold color={event.author?.color || 'white'}>
                  {event.author?.symbol} {event.author?.name}
                </Text>
                <Text> is live!</Text>
              </Box>
              <Box flexDirection="row" marginLeft={2}>
                <Text bold>{event.title}</Text>
              </Box>
              <Box flexDirection="row" marginLeft={2}>
                <Text dimColor>
                  👥 {Number(event.concurrentViewers).toLocaleString()}
                </Text>
                <Text dimColor> • </Text>
                <Text dimColor>
                  👍 {Number(event.likeCount).toLocaleString()}
                </Text>
                <Text dimColor> • </Text>
                <Text dimColor>
                  Started{' '}
                  {formatDistanceToNow(event.startTime, { addSuffix: true })}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Text bold underline>
        Upcoming Schedules (Page {page}/{totalPages === 0 ? 1 : totalPages})
      </Text>
      <Text dimColor>Use Left/Right arrows to navigate, 'q' to exit.</Text>
      {paginatedEvents.length === 0 && (
        <Box marginTop={1}>
          <Text italic dimColor>
            No upcoming events scheduled.
          </Text>
        </Box>
      )}
      {Object.entries(groupedEvents).map(
        ([date, dateEvents]: [string, ScheduleEvent[]]) => (
          <Box key={date} flexDirection="column" marginTop={1}>
            <Text bold color="cyan">
              {date}
            </Text>
            {dateEvents.map((event) => (
              <Box
                key={event.id}
                flexDirection="row"
                marginLeft={2}
                marginBottom={0}
              >
                <Text>
                  <Text color={disableColor ? undefined : 'cyan'}>
                    [
                    {event.startTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {event.endTime &&
                      ` - ${event.endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`}
                    ]
                  </Text>{' '}
                  <Text
                    bold
                    color={
                      disableColor ? undefined : event.author?.color || 'yellow'
                    }
                  >
                    {event.author?.symbol ? `${event.author.symbol} ` : ''}
                    {event.title}
                  </Text>
                  <Text dimColor>
                    {' '}
                    (
                    {formatDistanceToNow(event.startTime, {
                      addSuffix: true,
                    })}
                    )
                  </Text>
                </Text>
              </Box>
            ))}
          </Box>
        ),
      )}
    </Box>
  );
};

export default ScheduleListScreen;
