import {useEffect, useState} from 'react';

export const useCountdown = (targetDate: Date | undefined) => {
  let targetMillis: number | undefined;
  if (targetDate) {
    targetMillis = targetDate.getTime();
  }

  const getCallTimeCountDownMillis =
    () => targetMillis ? targetMillis - new Date().getTime() : undefined;

  const [countDownMillis, setCountDownMillis] =
    useState(getCallTimeCountDownMillis());

  useEffect(() => {
    setCountDownMillis(getCallTimeCountDownMillis());

    const interval = setInterval(() => {
      setCountDownMillis(getCallTimeCountDownMillis());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMillis]);

  if (!countDownMillis) {
    return undefined;
  }

  return getReturnValues(countDownMillis > 0 ? countDownMillis : 0);
};

const getReturnValues = (countDownMillis: number) => {
  const millisecondsPerMinute = 1000 * 60;
  const millisecondsPerHour = millisecondsPerMinute * 60;
  const millisecondsPerDay = millisecondsPerHour * 24;

  const days = Math.floor(countDownMillis / millisecondsPerDay);
  const hours = Math.floor(
    (countDownMillis % millisecondsPerDay) / millisecondsPerHour
  );
  const minutes = Math.floor(
    (countDownMillis % millisecondsPerHour) / millisecondsPerMinute
  );
  const seconds = Math.floor((countDownMillis % millisecondsPerMinute) / 1000);

  return {days, hours, minutes, seconds, hasExpired: countDownMillis <= 0};
};
