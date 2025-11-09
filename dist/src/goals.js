/**
 * Gets the start and end dates for a goal cycle based on the type and a reference date.
 * @param {string} goalType - 'D', 'W', 'M', or 'Y'.
 * @param {Date} refDate - The date to calculate the cycle for (usually today).
 * @returns {{start: Date, end: Date}}
 */
export function getCycle(goalType, refDate = new Date()) {
    const start = new Date(refDate);
    start.setHours(0, 0, 0, 0);

    switch (goalType) {
        case 'D': // Daily
            break;
        case 'W': // Weekly
            const dayOfWeek = start.getDay(); // Sunday = 0
            start.setDate(start.getDate() - dayOfWeek);
            break;
        case 'M': // Monthly
            start.setDate(1);
            break;
        case 'Y': // Yearly
            start.setMonth(0, 1);
            break;
        default:
            throw new Error(`Invalid goal type: ${goalType}`);
    }

    const end = new Date(start);
    switch (goalType) {
        case 'D': end.setDate(end.getDate() + 1); break;
        case 'W': end.setDate(end.getDate() + 7); break;
        case 'M': end.setMonth(end.getMonth() + 1); break;
        case 'Y': end.setFullYear(end.getFullYear() + 1); break;
    }

    return { start, end };
}

/**
 * Calculates progress towards a goal for a specific category.
 * @param {string} catId - The ID of the category.
 * @param {object} category - The category object, including the goal.
 * @param {Array} allLogs - The complete array of log entries.
 * @returns {object|null} An object with detailed progress metrics, or null if not applicable.
 */
export function calculateProgress(catId, category, allLogs) {
    if (!category || !category.g) return null;

    const goal = category.g;
    const today = new Date();
    const cycle = getCycle(goal.t, today);

    // --- Cycle-specific progress ---
    const cycleLogs = (allLogs || []).filter(log => {
        const logDate = new Date(log[1]);
        return log[2] === catId && logDate >= cycle.start && logDate < cycle.end;
    });
    const achieved = cycleLogs.reduce((sum, log) => sum + log[3], 0);
    const target = goal.x;
    const progress = target > 0 ? achieved / target : 0;
    const totalDaysInCycle = (cycle.end - cycle.start) / (1000 * 60 * 60 * 24);
    const elapsedDaysInCycle = Math.max(1, (today - cycle.start) / (1000 * 60 * 60 * 24));
    const remainingDays = Math.max(0, totalDaysInCycle - elapsedDaysInCycle);
    const idealPace = target / totalDaysInCycle;
    const currentCyclePace = achieved / elapsedDaysInCycle;
    const neededPerDay = remainingDays > 0 ? Math.max(0, (target - achieved) / remainingDays) : 0;
    const onTrack = currentCyclePace >= idealPace;
    const isCatchUp = !onTrack && achieved < target;
    let status = 'On Track';
    if (achieved >= target) {
        status = 'Goal Met';
    } else if (isCatchUp) {
        status = 'Behind';
    }

    // --- Lifetime pace calculation (new logic) ---
    const allLogsForCategory = (allLogs || []).filter(log => log[2] === catId);
    let pace = { daily: null, weekly: null, monthly: null };

    if (allLogsForCategory.length > 0) {
        const firstLog = allLogsForCategory.reduce((earliest, current) => 
            new Date(current[1]) < new Date(earliest[1]) ? current : earliest
        );
        const firstLogDate = new Date(firstLog[1]);
        const totalAchieved = allLogsForCategory.reduce((sum, log) => sum + log[3], 0);
        
        // Use floating point days for accurate conditional checks
        const daysElapsed = (today - firstLogDate) / (1000 * 60 * 60 * 24);

        if (daysElapsed >= 1) {
            pace.daily = totalAchieved / daysElapsed;
        }
        if (daysElapsed >= 7) {
            pace.weekly = totalAchieved / (daysElapsed / 7);
        }
        if (daysElapsed >= 30) {
            pace.monthly = totalAchieved / (daysElapsed / 30);
        }
    }

    return {
        target,
        achieved,
        progress,
        cycle,
        neededPerDay,
        status,
        onTrack,
        goalType: goal.t,
        isCatchUp,
        idealPace,
        pace // This now contains the accurate, conditional long-term pace
    };
}
