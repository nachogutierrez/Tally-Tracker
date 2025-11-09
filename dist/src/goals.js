// src/goals.js

/**
 * Calculates the start and end dates for a goal cycle in UTC.
 * @param {'D' | 'W' | 'M' | 'Y'} goalType
 * @param {Date} [now=new Date()] The current date to calculate the cycle for.
 * @returns {{start: Date, end: Date}}
 */
export function getGoalCycle(goalType, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  let end;

  switch (goalType) {
    case 'D':
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 1);
      break;
    case 'W':
      const dayOfWeek = start.getUTCDay(); // Sunday = 0, Monday = 1
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get to Monday
      start.setUTCDate(start.getUTCDate() - diff);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      break;
    case 'M':
      start.setUTCDate(1);
      end = new Date(start);
      end.setUTCMonth(start.getUTCMonth() + 1);
      break;
    case 'Y':
      start.setUTCMonth(0, 1);
      end = new Date(start);
      end.setUTCFullYear(start.getUTCFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid goal type: ${goalType}`);
  }

  return { start, end };
}

/**
 * Calculates the user's historical average pace for a given category.
 * @param {string} catId The category ID.
 * @param {Array} allLogs All log entries.
 * @returns {{daily: number|null, weekly: number|null, monthly: number|null}}
 */
export function calculatePace(catId, allLogs) {
    const catLogs = allLogs.filter(log => log[2] === catId).sort((a, b) => a[1].localeCompare(b[1]));

    if (catLogs.length < 1) {
        return { daily: null, weekly: null, monthly: null };
    }

    const firstLogTimestamp = catLogs[0][1];
    const firstLogDate = new Date(firstLogTimestamp);
    const now = new Date();

    // Calculate total days since the first log. Use a minimum of 1 to avoid division by zero.
    const elapsedMs = now.getTime() - firstLogDate.getTime();
    const elapsedDays = Math.max(1, elapsedMs / (1000 * 60 * 60 * 24));

    const totalDelta = catLogs.reduce((sum, log) => sum + log[3], 0);
    const dailyPace = totalDelta / elapsedDays;

    // Only provide weekly/monthly pace if enough time has passed for the average to be meaningful.
    const weeklyPace = elapsedDays >= 7 ? dailyPace * 7 : null;
    const monthlyPace = elapsedDays >= 30 ? dailyPace * 30.44 : null; // Avg days in a month

    return {
        daily: dailyPace,
        weekly: weeklyPace,
        monthly: monthlyPace,
    };
}


/**
 * Calculates the progress for a category with a goal.
 * @param {string} catId The category ID.
 * @param {object} category The category object.
 * @param {Array} logs The array of all logs.
 * @returns {object | null} Progress information or null if no goal.
 */
export function calculateProgress(catId, category, logs) {
  if (!category.g) return null;

  const { t: goalType, x: target } = category.g;
  const { start, end } = getGoalCycle(goalType);
  
  // DESIGN.md: Timestamps are stored as naive ISO strings. Assume UTC for calculations.
  const startTime = start.toISOString().substring(0, 19);
  const endTime = end.toISOString().substring(0, 19);

  const relevantLogs = logs.filter(log => {
    const logTimestamp = log[1];
    return log[2] === catId && logTimestamp >= startTime && logTimestamp < endTime;
  });

  const achieved = relevantLogs.reduce((sum, log) => sum + log[3], 0);
  const remaining = Math.max(0, target - achieved);
  const progress = target > 0 ? (achieved / target) : 0;

  // --- Projection & Pace Calculation ---
  const now = new Date();
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const daysForProjection = Math.max(1, remainingDays);
  const neededPerDay = Math.ceil(remaining / daysForProjection);

  // Edge Case Handling: If a goal is started late in a cycle, `neededPerDay` can be
  // discouragingly high. To provide better context, we calculate the "ideal" pace
  // as if progress was made evenly throughout the entire cycle.
  const cycleDurationMs = end.getTime() - start.getTime();
  const totalCycleDays = Math.round(cycleDurationMs / (1000 * 60 * 60 * 24));
  const idealPace = totalCycleDays > 0 ? Math.ceil(target / totalCycleDays) : target;

  // We enter a "catch-up" state if the required daily pace is significantly
  // higher than the ideal pace. This avoids showing alarming numbers for minor
  // deviations and only triggers for major discrepancies, like a late start.
  const CATCH_UP_THRESHOLD = 2.5; // Required pace must be >2.5x the ideal pace.
  const isCatchUp = neededPerDay > (idealPace * CATCH_UP_THRESHOLD) && remaining > idealPace;

  // A simple 'on track' logic: is your current progress percentage greater than the percentage of time elapsed in the cycle?
  const cycleDuration = end.getTime() - start.getTime();
  const elapsedDuration = Math.max(0, now.getTime() - start.getTime());
  const timeProgress = cycleDuration > 0 ? elapsedDuration / cycleDuration : 0;
  const onTrack = progress >= timeProgress;

  // Calculate historical pace
  const pace = calculatePace(catId, logs);

  return {
    target,
    achieved,
    remaining,
    progress,
    cycle: { start, end },
    remainingDays,
    neededPerDay,
    idealPace,
    isCatchUp,
    onTrack,
    status: onTrack ? 'On Track' : 'Behind',
    goalType,
    pace,
  };
}
