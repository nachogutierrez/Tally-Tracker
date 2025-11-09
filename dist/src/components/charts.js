// src/components/charts.js

/**
 * Renders a bar chart showing daily activity for the last 30 days.
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart in.
 * @param {object} category - The category object.
 * @param {Array} allLogs - The complete array of log entries.
 */
export function renderBarChart(canvas, category, allLogs) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const today = new Date();
    const labels = [];
    const data = [];

    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

        const dailyTotal = (allLogs || [])
            .filter(log => log[2] === category.id && log[1].startsWith(dateString))
            .reduce((sum, log) => sum + log[3], 0);
        data.push(dailyTotal);
    }

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Activity',
                data,
                backgroundColor: '#4f46e5',
                borderColor: '#312e81',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { autoSkip: true, maxTicksLimit: 10 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

/**
 * Renders a line chart showing cumulative activity over the last 90 days.
 * @param {HTMLCanvasElement} canvas - The canvas element to render the chart in.
 * @param {object} category - The category object.
 * @param {Array} allLogs - The complete array of log entries.
 */
export function renderLineChart(canvas, category, allLogs) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const today = new Date();
    const labels = [];
    const data = [];
    let cumulativeTotal = 0;

    for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

        const dailyTotal = (allLogs || [])
            .filter(log => log[2] === category.id && log[1].startsWith(dateString))
            .reduce((sum, log) => sum + log[3], 0);
        
        cumulativeTotal += dailyTotal;
        data.push(cumulativeTotal);
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Cumulative Activity',
                data,
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderColor: '#4f46e5',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { autoSkip: true, maxTicksLimit: 10 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}
