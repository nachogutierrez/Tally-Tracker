// src/ui/insights.js
import { DOM } from '../config.js';
import * as Goals from '../goals.js';

function getGoalTypeName(type) {
    switch (type) {
        case 'D': return 'Daily';
        case 'W': return 'Weekly';
        case 'M': return 'Monthly';
        case 'Y': return 'Yearly';
        default: return '';
    }
}

function formatDate(date) {
    // Display date in user's local timezone as per DESIGN.md
    return date.toLocaleDate'String(undefined, { month: 'short', day: 'numeric', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

function formatPace(value) {
    return value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString();
}

export function renderInsights(appState) {
    const { cats, logs } = appState;
    const container = DOM.insightsTab;

    const categoriesWithGoals = Object.entries(cats || {})
        .filter(([, cat]) => cat.g)
        .map(([id, cat]) => ({ id, ...cat }));

    if (categoriesWithGoals.length === 0) {
        container.innerHTML = `<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">No Goals Set</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">Add a goal to a category to see your progress here.</p>
        </div>`;
        return;
    }

    const cardsHtml = categoriesWithGoals.map(cat => {
        const progressData = Goals.calculateProgress(cat.id, cat, logs);
        if (!progressData) return '';

        const {
            target, achieved, progress, cycle,
            neededPerDay, status, onTrack, goalType,
            isCatchUp, idealPace, pace
        } = progressData;

        const percent = Math.min(100, Math.round(progress * 100));
        const goalTypeName = getGoalTypeName(goalType);
        
        const cycleStart = formatDate(cycle.start);
        const cycleEnd = new Date(cycle.end.getTime() - 1);
        const cycleEndFormatted = formatDate(cycleEnd);

        let projectionHtml;
        if (isCatchUp) {
            projectionHtml = `
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    You're behind schedule. To catch up now requires an average of <strong class="text-amber-600 dark:text-amber-400">${neededPerDay.toLocaleString()}</strong> per day.
                    <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">(The original target pace was ~${idealPace.toLocaleString()} per day)</span>
                </p>
            `;
        } else {
            projectionHtml = `
                <p class="text-sm text-gray-600 dark:text-gray-300">
                    To reach your goal, you need about <strong class="text-indigo-600 dark:text-indigo-400">${neededPerDay.toLocaleString()}</strong> per day on average.
                </p>
            `;
        }

        let paceHtml = '';
        if (pace.daily !== null) {
            const paceItems = [
                `<strong>${formatPace(pace.daily)}</strong>/day`
            ];
            if (pace.weekly !== null) {
                paceItems.push(`<strong>${formatPace(pace.weekly)}</strong>/week`);
            }
            if (pace.monthly !== null) {
                paceItems.push(`<strong>${formatPace(pace.monthly)}</strong>/month`);
            }
            paceHtml = `
                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your Actual Pace</h4>
                    <div class="flex justify-center space-x-4 text-xs text-gray-600 dark:text-gray-300">
                        ${paceItems.map(item => `<span>${item}</span>`).join('<span class="border-l border-gray-300 dark:border-gray-600"></span>')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md mb-6">
                <div class="flex justify-between items-baseline">
                    <h3 class="text-xl font-bold mb-1">${cat.n}</h3>
                    <span class="text-xs font-semibold px-2 py-1 rounded-full ${onTrack ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}">${status}</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${goalTypeName} Goal (${cycleStart} - ${cycleEndFormatted})</p>

                <div class="flex justify-between items-center mb-1 text-gray-800 dark:text-gray-200">
                    <span class="font-bold text-2xl">${achieved.toLocaleString()}</span>
                    <span class="text-gray-500 dark:text-gray-400">of ${target.toLocaleString()}</span>
                </div>

                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                    <div class="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full" style="width: ${percent}%"></div>
                </div>

                ${paceHtml}

                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    ${projectionHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cardsHtml;
}
