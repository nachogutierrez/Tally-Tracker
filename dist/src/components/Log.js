import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { useApi } from '../api.js';

const html = htm.bind(h);

function Log({ data }) {
  const { addLog, editLog, deleteLog } = useApi();
  const { cats, logs } = data;

  const [catId, setCatId] = useState('');
  const [delta, setDelta] = useState(1);
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState('');

  useEffect(() => {
    const lastUsedCat = localStorage.getItem('lastUsedCat');
    if (lastUsedCat && cats[lastUsedCat]) {
      setCatId(lastUsedCat);
    }
  }, [cats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!catId || !delta || !timestamp) {
      alert('Please fill out all fields.');
      return;
    }
    await addLog(catId, delta, timestamp, note);
    localStorage.setItem('lastUsedCat', catId);
    setNote('');
  };

  const sortedLogs = (logs || []).slice().sort((a, b) => b[1].localeCompare(a[1]));

  return html`
    <div class="space-y-6">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold mb-4">Log an Activity</h2>
        <form onSubmit=${handleSubmit} class="space-y-4">
          <div>
            <label for="log-cat" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select id="log-cat" value=${catId} onChange=${(e) => setCatId(e.target.value)} required class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select a category...</option>
              ${Object.keys(cats).map(id => html`<option value=${id}>${cats[id].n}</option>`)}
            </select>
          </div>
          <div>
            <label for="log-delta" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Count</label>
            <input type="number" id="log-delta" value=${delta} onChange=${(e) => setDelta(parseInt(e.target.value, 10))} required min="1" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label for="log-timestamp" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp</label>
            <input type="datetime-local" id="log-timestamp" value=${timestamp} onChange=${(e) => setTimestamp(e.target.value)} required class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label for="log-note" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Note (Optional)</label>
            <input type="text" id="log-note" value=${note} onChange=${(e) => setNote(e.target.value)} class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <button type="submit" class="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
            Save Log
          </button>
        </form>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold mb-4">Recent History</h2>
        <ul class="space-y-2">
          ${sortedLogs.map(log => {
            const [id, ts, cId, d, n] = log;
            const catName = cats[cId]?.n || 'Unknown';
            return html`
              <li key=${id} class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div>
                  <p class="font-semibold">${catName}: +${d}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${new Date(ts).toLocaleString()}${n ? ` - ${n}` : ''}</p>
                </div>
                <div class="space-x-2">
                  <button onClick=${() => deleteLog(id)} class="text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
                </div>
              </li>
            `;
          })}
        </ul>
      </div>
    </div>
  `;
}

export default Log;