import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import * as Goals from '../goals.js';
import * as Charts from './charts.js';

const html = htm.bind(h);

function formatDate(date) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
}

function formatPace(value) {
    return value < 10 ? value.toFixed(1) : Math.round(value).toLocaleString();
}

function GoalCard({ category, logs }) {
    const barChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const chartInstances = useRef([]);

    const progressData = Goals.calculateProgress(category.id, category, logs);

    useEffect(() => {
        // Cleanup previous charts
        chartInstances.current.forEach(chart => chart.destroy());
        chartInstances.current = [];

        if (progressData) {
            if (barChartRef.current) {
                const barChart = Charts.renderBarChart(barChartRef.current, category, logs);
                if (barChart) chartInstances.current.push(barChart);
            }
            if (lineChartRef.current) {
                const lineChart = Charts.renderLineChart(lineChartRef.current, category, logs);
                if (lineChart) chartInstances.current.push(lineChart);
            }
        }
        
        return () => {
            chartInstances.current.forEach(chart => chart.destroy());
        };
    }, [category, logs, progressData]);

    if (!progressData) return null;

    const {
        target, achieved, progress, cycle,
        neededPerDay, status, onTrack, goalType,
        isCatchUp, idealPace, pace
    } = progressData;

    const percent = Math.min(100, Math.round(progress * 100));
    const goalTypeName = { D: 'Daily', W: 'Weekly', M: 'Monthly', Y: 'Yearly' }[goalType] || '';
    
    const cycleStart = formatDate(cycle.start);
    const cycleEnd = new Date(cycle.end.getTime() - 1);
    const cycleEndFormatted = formatDate(cycleEnd);

    const paceItems = [];
    if (pace.daily !== null) paceItems.push(html`<span><strong>${formatPace(pace.daily)}</strong>/day</span>`);
    if (pace.weekly !== null) paceItems.push(html`<span><strong>${formatPace(pace.weekly)}</strong>/week</span>`);
    if (pace.monthly !== null) paceItems.push(html`<span><strong>${formatPace(pace.monthly)}</strong>/month</span>`);

    return html`
        <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md mb-6">
            <div class="flex justify-between items-baseline">
                <h3 class="text-xl font-bold mb-1">${category.n}</h3>
                <span class="text-xs font-semibold px-2 py-1 rounded-full ${onTrack ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}">${status}</span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${goalTypeName} Goal (${cycleStart} - ${cycleEndFormatted})</p>

            <div class="flex justify-between items-center mb-1 text-gray-800 dark:text-gray-200">
                <span class="font-bold text-2xl">${achieved.toLocaleString()}</span>
                <span class="text-gray-500 dark:text-gray-400">of ${target.toLocaleString()}</span>
            </div>

            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                <div class="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full" style=${{width: `${percent}%`}}></div>
            </div>

            ${paceItems.length > 0 && html`
                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your Actual Pace</h4>
                    <div class="flex justify-center space-x-4 text-xs text-gray-600 dark:text-gray-300">
                        ${paceItems.reduce((acc, item, i) => [...acc, i > 0 && html`<span class="border-l border-gray-300 dark:border-gray-600"></span>`, item], [])}
                    </div>
                </div>
            `}

            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                ${isCatchUp ? html`
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        You're behind schedule. To catch up now requires an average of <strong class="text-amber-600 dark:text-amber-400">${neededPerDay.toLocaleString()}</strong> per day.
                        <span class="block text-xs text-gray-500 dark:text-gray-400 mt-1">(The original target pace was ~${idealPace.toLocaleString()} per day)</span>
                    </p>
                ` : html`
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        To reach your goal, you need about <strong class="text-indigo-600 dark:text-indigo-400">${neededPerDay.toLocaleString()}</strong> per day on average.
                    </p>
                `}
            </div>

            <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 class="text-lg font-semibold text-center mb-2">Activity Charts</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                        <h5 class="text-center font-medium mb-1">Last 30 Days (by day)</h5>
                        <div class="h-48">
                            <canvas ref=${barChartRef}></canvas>
                        </div>
                    </div>
                    <div>
                        <h5 class="text-center font-medium mb-1">Last 90 Days (cumulative)</h5>
                        <div class="h-48">
                            <canvas ref=${lineChartRef}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function Insights({ data }) {
    const { cats, logs } = data;

    const categoriesWithGoals = Object.entries(cats || {})
        .filter(([, cat]) => cat.g)
        .map(([id, cat]) => ({ id, ...cat }));

    if (categoriesWithGoals.length === 0) {
        return html`
            <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">No Goals Set</h3>
                <p class="text-gray-500 dark:text-gray-400 mt-2 text-sm">Add a goal to a category to see your progress here.</p>
            </div>
        `;
    }

    return html`
        <div class="pb-24">
            ${categoriesWithGoals.map(cat => html`<${GoalCard} key=${cat.id} category=${cat} logs=${logs} />`)}
        </div>
    `;
}

export default Insights;