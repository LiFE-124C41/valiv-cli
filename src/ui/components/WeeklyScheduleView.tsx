import React from 'react';
import { Box, Text } from 'ink';
import { ScheduleEvent } from '../../domain/models.js';

interface WeeklyScheduleViewProps {
  events: ScheduleEvent[];
  disableColor?: boolean;
}

const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  events,
  disableColor,
}) => {
  // 1. Get current date and next 6 days (total 7 days)
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    d.setHours(0, 0, 0, 0); // Normalize properly
    return d;
  });

  // 2. Group events by date
  const groupedEvents: Record<string, ScheduleEvent[]> = {};
  weekDays.forEach((day) => {
    groupedEvents[day.toDateString()] = [];
  });

  events.forEach((event) => {
    const eventDate = new Date(event.startTime);
    eventDate.setHours(0, 0, 0, 0);
    const dateStr = eventDate.toDateString();
    if (groupedEvents[dateStr]) {
      groupedEvents[dateStr].push(event);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold underline>
        Weekly Schedule (Next 7 Days)
      </Text>
      <Box flexDirection="row" marginTop={1}>
        {weekDays.map((day) => {
          const dateStr = day.toDateString();
          const dayEvents = groupedEvents[dateStr] || [];

          return (
            <Box
              key={dateStr}
              flexDirection="column"
              width={20}
              marginRight={1}
              borderStyle="single"
            >
              <Box
                justifyContent="center"
                borderStyle="single"
                borderBottom={false}
                borderTop={false}
                borderLeft={false}
                borderRight={false}
              >
                <Text bold color="cyan">
                  {day.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </Text>
              </Box>
              {dayEvents.length === 0 ? (
                <Text dimColor>No events</Text>
              ) : (
                dayEvents.map((event) => (
                  <Box
                    key={event.id}
                    flexDirection="column"
                    marginTop={1}
                    paddingX={1}
                  >
                    <Text color={disableColor ? undefined : 'green'}>
                      {event.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {event.endTime &&
                        ` - ${event.endTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`}
                    </Text>
                    <Text
                      wrap="truncate-end"
                      bold={!disableColor}
                      color={
                        disableColor
                          ? undefined
                          : event.author?.color || 'white'
                      }
                    >
                      {event.author?.name}
                    </Text>
                  </Box>
                ))
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default WeeklyScheduleView;
