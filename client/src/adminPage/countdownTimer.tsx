import * as React from 'react';
import {Paper, Typography} from '@mui/material';
import {useEffect, useState} from 'react';

interface CountdownTimerProps {
  targetDate: Date,
  alwaysShowDays?: boolean,
  alwaysShowHours?: boolean
}

export const CountdownTimer = (props: CountdownTimerProps) => {
  const [days, hours, minutes, seconds] = useCountdown(props.targetDate);

  let timerString = '';

  if (days || props.alwaysShowDays) {
    timerString += days.toString().padStart(2, '0') + ':';
  }

  if (days || hours || props.alwaysShowDays || props.alwaysShowHours) {
    timerString += hours.toString().padStart(2, '0') + ':';
  }

  timerString += minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');

  return (
    <Paper elevation={6} style={{margin: 'auto', width: 'fit-content', padding: '8px 12px'}}>
      <Typography>
        {timerString}
      </Typography>
    </Paper>
  );
};

const useCountdown = (targetDate: Date | number) => {
  const countDownDate = new Date(targetDate).getTime();

  const [countDown, setCountDown] = useState(
    countDownDate - new Date().getTime()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountDown(countDownDate - new Date().getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [countDownDate]);

  return getReturnValues(countDown > 0 ? countDown : 0);
};

const getReturnValues = (countDown: number) => {
  const millisecondsPerMinute = 1000 * 60;
  const millisecondsPerHour = millisecondsPerMinute * 60;
  const millisecondsPerDay = millisecondsPerHour * 24;

  const days = Math.floor(countDown / millisecondsPerDay);
  const hours = Math.floor(
    (countDown % millisecondsPerDay) / millisecondsPerHour
  );
  const minutes = Math.floor((countDown % millisecondsPerHour) / millisecondsPerMinute);
  const seconds = Math.floor((countDown % millisecondsPerMinute) / 1000);

  return [days, hours, minutes, seconds];
};