import { DOM } from './config.js';
import * as Google from './google.js';
import * as UI from './ui.js';

let appState = { cats: {}, logs: [] };

// --- DATA MUTATION ---
function generateShortId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function getNextLogId() {
  return (appState.logs || []).reduce((maxId, log) => Math.max(log[0], maxId), 0) + 1;
}

async function addCategory(name, goal) {
  const normalizedName = name.toLowerCase();
  const existingCategory = Object.values(appState.cats || {}).find(
    (cat) => cat.n.toLowerCase() === normalizedName
  );

  if (existingCategory) {
    alert(`Category "${name}" already exists.`);
    return;
  }

  const newId = generateShortId();
  appState.cats[newId] = { n: name, g: goal };
  await Google.saveStateToDrive(appState);
  UI.render(appState);
}

async function editCategory(id, newName) {
  if (appState.cats[id]) {
    appState.cats[id].n = newName;
    await Google.saveStateToDrive(appState);
    UI.render(appState);
  }
}

async function deleteCategory(id) {
  if (appState.cats[id]) {
    appState.logs = (appState.logs || []).filter(log => log[2] !== id);
    delete appState.cats[id];
    await Google.saveStateToDrive(appState);
    UI.render(appState);
  }
}

async function addLog(catId, delta, timestamp, note) {
  const newLog = [getNextLogId(), timestamp, catId, delta];
  if (note) newLog.push(note);
  appState.logs.push(newLog);
  await Google.saveStateToDrive(appState);
  UI.render(appState);
}

async function editLog(id, newDelta, newNote) {
  const logIndex = (appState.logs || []).findIndex(log => log[0] === id);
  if (logIndex > -1) {
      appState.logs[logIndex][3] = newDelta;
      const noteIndex = 4;
      if (newNote) {
          appState.logs[logIndex][noteIndex] = newNote;
      } else if (appState.logs[logIndex].length > noteIndex) {
          appState.logs[logIndex].splice(noteIndex, 1);
      }
      await Google.saveStateToDrive(appState);
      UI.render(appState);
  }
}

async function deleteLog(id) {
  appState.logs = (appState.logs || []).filter(log => log[0] !== id);
  await Google.saveStateToDrive(appState);
  UI.render(appState);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  DOM.addCategoryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form['cat-name'].value.trim();
    const goalType = form['cat-goal-type'].value;
    const goalTarget = form['cat-goal-target'].value;

    if (!name) return;

    let goal = null;
    if (goalType && goalTarget) {
      goal = { t: goalType, x: parseInt(goalTarget, 10) };
    }
    
    await addCategory(name, goal);
    form.reset();
    DOM.catGoalTarget.disabled = true;
  });

  DOM.catGoalType.addEventListener("change", (e) => {
    DOM.catGoalTarget.disabled = !e.target.value;
    if (!e.target.value) DOM.catGoalTarget.value = "";
  });

  DOM.categoryList.addEventListener("click", (e) => {
    const target = e.target;
    const catId = target.dataset.id;
    if (!catId) return;

    if (target.classList.contains("edit-cat-btn")) {
      const currentName = appState.cats[catId]?.n;
      const newName = prompt("Enter new category name:", currentName);
      if (newName && newName.trim() && newName !== currentName) {
        editCategory(catId, newName.trim());
      }
    } else if (target.classList.contains("delete-cat-btn")) {
      const catName = appState.cats[catId]?.n;
      const confirmation = prompt(`To delete "${catName}" and all its logs, type the name to confirm:`);
      if (confirmation === catName) {
        deleteCategory(catId);
      } else if (confirmation !== null) {
        alert("Deletion cancelled. The name did not match.");
      }
    }
  });

  DOM.logForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const catId = form['log-cat'].value;
      const delta = parseInt(form['log-delta'].value, 10);
      const timestamp = form['log-timestamp'].value;
      const note = form['log-note'].value.trim();

      if (!catId || !delta || !timestamp) return alert("Please fill out category, count, and timestamp.");
      if (new Date(timestamp) > new Date()) return alert("Future timestamps are not allowed.");

      await addLog(catId, delta, timestamp, note || undefined);
      
      localStorage.setItem('lastUsedCat', catId);
      localStorage.setItem('lastUsedDelta', delta);

      form['log-note'].value = '';
      UI.setDefaultTimestamp();
  });

  document.querySelectorAll('.quick-delta-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
          DOM.logDelta.value = e.target.dataset.delta;
      });
  });

  DOM.logHistory.addEventListener('click', (e) => {
      const target = e.target;
      const logId = parseInt(target.dataset.id, 10);
      if (!logId) return;

      const log = (appState.logs || []).find(l => l[0] === logId);
      if (!log) return;

      if (target.classList.contains('delete-log-btn')) {
          if (confirm('Are you sure you want to delete this log?')) {
              deleteLog(logId);
          }
      } else if (target.classList.contains('edit-log-btn')) {
          const [, , , delta, note] = log;
          const newDeltaStr = prompt('Enter new count:', delta);
          if (newDeltaStr === null) return;
          
          const newDelta = parseInt(newDeltaStr, 10);
          if (isNaN(newDelta) || newDelta <= 0) return alert("Invalid count.");

          const newNote = prompt('Enter new note (optional):', note || '');
          if (newNote === null) return;

          editLog(logId, newDelta, newNote.trim() || undefined);
      }
  });
}

// --- INITIALIZATION ---
async function handleSignedIn() {
  const userProfile = await Google.getUserProfile();
  UI.showSignedInView(userProfile, handleSignOut);
  
  const data = await Google.loadDataFromDrive();
  if (data) {
    appState = data;
    UI.render(appState);
  }
}

function handleSignOut() {
  Google.signOut(() => {
    appState = { cats: {}, logs: [] };
    UI.showSignedOutView(handleSignIn);
  });
}

function handleSignIn() {
  Google.requestAccessToken();
}

async function main() {
  UI.setupTheme();
  UI.setupTabs();
  setupEventListeners();
  
  UI.setDefaultTimestamp();
  const lastDelta = localStorage.getItem('lastUsedDelta');
  if (lastDelta) DOM.logDelta.value = lastDelta;

  const gapiReady = await Google.initGoogleClient(handleSignedIn);
  if (!gapiReady) {
    document.getElementById('app').innerHTML = '<p class="text-red-500 text-center mt-8">Error loading Google API client. Please check your configuration and network connection.</p>';
    return;
  }

  // If not signed in after init, show the sign-out view
  if (!gapi.client.getToken()) {
    UI.showSignedOutView(handleSignIn);
  }
}

main();
