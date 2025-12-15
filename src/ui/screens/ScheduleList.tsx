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

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      setTimeout(() => process.exit(0), 100);
    }

    if (key.rightArrow) {
      const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);
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

  if (events.length === 0) {
    return (
      <Box padding={1}>
        <Text>No upcoming schedules found.</Text>
      </Box>
    );
  }

  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, endIndex);
  const totalPages = Math.ceil(events.length / ITEMS_PER_PAGE);

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

  if (week) {
    return <WeeklyScheduleView events={events} disableColor={disableColor} />;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Upcoming Schedules (Page {page}/{totalPages})
      </Text>
      <Text dimColor>Use Left/Right arrows to navigate, 'q' to exit.</Text>
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
