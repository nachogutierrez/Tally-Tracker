// src/ui/charts.js

// Store chart instances to prevent memory leaks
const chartInstances = {};

function getChartColors(isDark) {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#d1d5db' : '#6b7280'; // gray-300 or gray-500
    return { gridColor, textColor };
}

function getBaseChartOptions(isDark) {
    const { gridColor, textColor } = getChartColors(isDark);
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.8)', // gray-900
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: gridColor },
                ticks: { color: textColor },
            },
            x: {
                grid: { display: false },
                ticks: { color: textColor },
            },
        },
    };
}

/**
 * Renders a 30-day bar chart for a category using Chart.js.
 * @param {HTMLCanvasElement} canvas The canvas element to draw on.
 * @param {object} category The category object.
 * @param {Array} logs The array of all logs.
 */
export function renderBarChart(canvas, category, logs) {
    const chartId = `bar-${category.id}`;
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const options = getBaseChartOptions(isDark);

    const catLogs = logs.filter(log => log[2] === category.id);
    
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (29 - i));
        labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        data.push(0);
    }

    catLogs.forEach(log => {
        const logDate = new Date(log[1]);
        logDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 30) {
            data[29 - diffDays] += log[3];
        }
    });

    chartInstances[chartId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Daily Total',
                data,
                backgroundColor: 'rgba(99, 102, 241, 0.7)', // indigo-500
                borderColor: 'rgba(79, 70, 229, 1)', // indigo-600
                borderWidth: 1,
            }],
        },
        options,
    });
}

/**
 * Renders a 90-day cumulative line chart for a category using Chart.js.
 * @param {HTMLCanvasElement} canvas The canvas element to draw on.
 * @param {object} category The category object.
 * @param {Array} logs The array of all logs.
 */
export function renderLineChart(canvas, category, logs) {
    const chartId = `line-${category.id}`;
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const options = getBaseChartOptions(isDark);
    
    const catLogs = logs.filter(log => log[2] === category.id).sort((a, b) => new Date(a[1]) - new Date(b[1]));

    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (89 - i));
        labels.push(date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    }

    let cumulativeTotal = 0;
    let logIndex = 0;
    for (let i = 0; i < 90; i++) {
        const dayEnd = new Date(today);
        dayEnd.setDate(today.getDate() - (89 - i));
        dayEnd.setHours(23, 59, 59, 999);

        while (logIndex < catLogs.length && new Date(catLogs[logIndex][1]) <= dayEnd) {
            cumulativeTotal += catLogs[logIndex][3];
            logIndex++;
        }
        data.push(cumulativeTotal);
    }

    chartInstances[chartId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Cumulative Total',
                data,
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderColor: 'rgba(79, 70, 229, 1)', // indigo-600
                borderWidth: 2,
                tension: 0.1,
                fill: true,
            }],
        },
        options,
    });
}
