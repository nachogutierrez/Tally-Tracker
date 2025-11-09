import { h } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';
import { useApi } from '../api.js';

const html = htm.bind(h);

function Categories({ data }) {
  const { addCategory, editCategory, deleteCategory } = useApi();
  const { cats } = data;

  const [name, setName] = useState('');
  const [goalType, setGoalType] = useState('D');
  const [goalTarget, setGoalTarget] = useState('');
  const [deletingCatId, setDeletingCatId] = useState(null);
  const [confirmationName, setConfirmationName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !goalTarget) return;
    const goal = { t: goalType, x: parseInt(goalTarget, 10) };
    await addCategory(name, goal);
    setName('');
    setGoalType('D');
    setGoalTarget('');
  };

  const handleDeleteConfirm = () => {
    if (deletingCatId && cats[deletingCatId] && confirmationName === cats[deletingCatId].n) {
      deleteCategory(deletingCatId);
      setDeletingCatId(null);
      setConfirmationName('');
    }
  };

  return html`
    <div class="space-y-6 pb-24">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold mb-4">Manage Categories</h2>
        <form onSubmit=${handleSubmit} class="space-y-4">
          <div>
            <label for="cat-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category Name</label>
            <input type="text" id="cat-name" value=${name} onChange=${(e) => setName(e.target.value)} required maxlength="50" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label for="cat-goal-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Type</label>
            <select id="cat-goal-type" value=${goalType} onChange=${(e) => setGoalType(e.target.value)} class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="D">Daily</option>
              <option value="W">Weekly</option>
              <option value="M">Monthly</option>
              <option value="Y">Yearly</option>
            </select>
          </div>
          <div>
            <label for="cat-goal-target" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Goal Target</label>
            <input type="number" id="cat-goal-target" value=${goalTarget} onChange=${(e) => setGoalTarget(e.target.value)} min="1" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          <button type="submit" class="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
            Add Category
          </button>
        </form>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-bold mb-4">Category List</h2>
        <ul class="space-y-3">
          ${Object.keys(cats).map(id => {
            const cat = cats[id];
            let goalText = "No goal set";
            if (cat.g) {
              const goalTypes = { D: 'Daily', W: 'Weekly', M: 'Monthly', Y: 'Yearly' };
              goalText = `${goalTypes[cat.g.t] || 'Unknown'}: ${cat.g.x}`;
            }
            return html`
              <li key=${id} class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div>
                  <p class="font-semibold">${cat.n}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${goalText}</p>
                </div>
                <div class="space-x-2">
                  <button onClick=${() => {
                    const newName = prompt('Enter new name', cat.n);
                    if (newName) editCategory(id, newName);
                  }} class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">Edit</button>
                  <button onClick=${() => setDeletingCatId(id)} class="text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
                </div>
              </li>
            `;
          })}
        </ul>
      </div>
      ${deletingCatId && html`
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 class="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p class="mb-4">This action cannot be undone. All logged data for this category will be permanently deleted. To confirm, please type the category name: <span class="font-bold">${cats[deletingCatId].n}</span></p>
            <input type="text" value=${confirmationName} onInput=${(e) => setConfirmationName(e.target.value)} class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm mb-4" />
            <div class="flex justify-end space-x-2">
              <button onClick=${() => { setDeletingCatId(null); setConfirmationName(''); }} class="px-4 py-2 rounded-md text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
              <button onClick=${handleDeleteConfirm} disabled=${confirmationName !== (cats[deletingCatId] && cats[deletingCatId].n)} class="px-4 py-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-800">Delete</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}

export default Categories;