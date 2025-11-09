import { DOM } from './config.js';

export function setupTheme() {
  const applyTheme = (isDark) => {
    document.documentElement.classList.toggle("dark", isDark);
    DOM.themeIconLight.classList.toggle("hidden", !isDark);
    DOM.themeIconDark.classList.toggle("hidden", isDark);
  };

  const isDarkMode = localStorage.getItem("theme") === "dark" || 
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  applyTheme(isDarkMode);

  DOM.themeToggle.addEventListener("click", () => {
    const isCurrentlyDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isCurrentlyDark ? "light" : "dark");
    applyTheme(!isCurrentlyDark);
  });
}

export function setupTabs() {
  const ACTIVE_CLASSES = ["text-indigo-600", "dark:text-indigo-400", "border-indigo-500"];
  const INACTIVE_CLASSES = ["text-gray-500", "hover:text-gray-700", "dark:text-gray-400", "dark:hover:text-gray-200", "hover:border-gray-300", "dark:hover:border-gray-600", "border-transparent"];
  
  DOM.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.tab;

      DOM.tabs.forEach(t => {
        t.classList.remove(...ACTIVE_CLASSES);
        t.classList.add(...INACTIVE_CLASSES);
      });
      tab.classList.add(...ACTIVE_CLASSES);
      tab.classList.remove(...INACTIVE_CLASSES);

      DOM.tabContents.forEach(content => {
        content.classList.toggle("hidden", content.id !== `tab-content-${targetTab}`);
      });
    });
  });
  // Set initial state
  document.querySelector('[data-tab="log"]').click();
}

export function showSignedOutView(onSignIn) {
  DOM.signedOutView.classList.remove("hidden");
  DOM.signedInView.classList.add("hidden");
  const signInButton = document.createElement("button");
  signInButton.innerText = "Sign In with Google";
  signInButton.className = "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105";
  signInButton.onclick = onSignIn;
  DOM.signInBtnContainer.innerHTML = "";
  DOM.signInBtnContainer.appendChild(signInButton);
}

export function showSignedInView(userProfile, onSignOut) {
  DOM.signedOutView.classList.add("hidden");
  DOM.signedInView.classList.remove("hidden");

  DOM.authContainer.innerHTML = "";
  const authControl = document.createElement("div");
  authControl.className = "flex items-center space-x-2";
  
  const userImage = document.createElement("img");
  userImage.src = userProfile.picture || "";
  userImage.alt = "User avatar";
  userImage.className = "w-8 h-8 rounded-full";
  
  const signOutButton = document.createElement("button");
  signOutButton.innerHTML = `<span class="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">${userProfile.email}</span><span class="sm:hidden text-xs text-red-500 dark:text-red-400">Sign Out</span>`;
  signOutButton.className = "p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700";
  signOutButton.onclick = onSignOut;
  
  authControl.appendChild(userImage);
  authControl.appendChild(signOutButton);
  DOM.authContainer.appendChild(authControl);
}

export function render(appState) {
  renderCategories(appState);
  renderLogs(appState);
  populateLogCategoryDropdown(appState);
}

function populateLogCategoryDropdown(appState) {
  const select = DOM.logCategory;
  const cats = appState.cats || {};
  const catIds = Object.keys(cats);
  
  const lastUsedCat = localStorage.getItem('lastUsedCat');
  const currentSelection = select.value;
  select.innerHTML = '<option value="">Select a category...</option>';

  if (catIds.length > 0) {
    catIds.sort((a, b) => cats[a].n.localeCompare(cats[b].n)).forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = cats[id].n;
      select.appendChild(option);
    });
  }
  
  select.value = cats[currentSelection] ? currentSelection : (cats[lastUsedCat] ? lastUsedCat : "");
}

function renderCategories(appState) {
  DOM.categoryList.innerHTML = "";
  const cats = appState.cats || {};
  const catIds = Object.keys(cats);

  if (catIds.length === 0) {
    DOM.categoryList.innerHTML = `<p class="text-gray-500 dark:text-gray-400">No categories yet. Add one above!</p>`;
    return;
  }

  const list = document.createElement("ul");
  list.className = "space-y-3";
  catIds.sort((a, b) => cats[a].n.localeCompare(cats[b].n)).forEach(id => {
    const cat = cats[id];
    const item = document.createElement("li");
    item.className = "flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md";
    
    let goalText = "No goal set";
    if (cat.g) {
      const goalTypes = { D: 'Daily', W: 'Weekly', M: 'Monthly', Y: 'Yearly' };
      goalText = `${goalTypes[cat.g.t] || 'Unknown'}: ${cat.g.x}`;
    }

    item.innerHTML = `
      <div>
        <p class="font-semibold">${cat.n}</p>
        <p class="text-sm text-gray-500 dark:text-gray-400">${goalText}</p>
      </div>
      <div class="space-x-2">
        <button data-id="${id}" class="edit-cat-btn text-indigo-600 dark:text-indigo-400 hover:underline text-sm">Edit</button>
        <button data-id="${id}" class="delete-cat-btn text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
  DOM.categoryList.appendChild(list);
}

function renderLogs(appState) {
  DOM.logHistory.innerHTML = "";
  const logs = (appState.logs || []).slice().sort((a, b) => b[1].localeCompare(a[1]));

  if (logs.length === 0) {
      DOM.logHistory.innerHTML = `<p class="text-gray-500 dark:text-gray-400">No activities logged yet.</p>`;
      return;
  }

  const groups = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  logs.forEach(log => {
      const logDate = new Date(log[1]);
      logDate.setHours(0, 0, 0, 0);
      let groupKey;
      if (logDate.getTime() === today.getTime()) {
          groupKey = "Today";
      } else if (logDate.getTime() === yesterday.getTime()) {
          groupKey = "Yesterday";
      } else {
          groupKey = logDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(log);
  });

  const fragment = document.createDocumentFragment();
  for (const groupName in groups) {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'mb-4';
      
      const groupHeader = document.createElement('h3');
      groupHeader.className = 'text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-1';
      groupHeader.textContent = groupName;
      groupContainer.appendChild(groupHeader);

      const logList = document.createElement('ul');
      logList.className = 'space-y-2';
      
      groups[groupName].forEach(log => {
          const [id, timestamp, catId, delta, note] = log;
          const catName = appState.cats[catId]?.n || 'Unknown Category';
          const logTime = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const item = document.createElement('li');
          item.className = 'flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md';
          item.innerHTML = `
              <div class="flex-grow">
                  <p class="font-semibold">${catName}: +${delta}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${logTime}${note ? ` - <span class="italic">${note}</span>` : ''}</p>
              </div>
              <div class="space-x-2 flex-shrink-0">
                  <button data-id="${id}" class="edit-log-btn text-indigo-600 dark:text-indigo-400 hover:underline text-sm">Edit</button>
                  <button data-id="${id}" class="delete-log-btn text-red-600 dark:text-red-400 hover:underline text-sm">Delete</button>
              </div>
          `;
          logList.appendChild(item);
      });
      groupContainer.appendChild(logList);
      fragment.appendChild(groupContainer);
  }
  DOM.logHistory.appendChild(fragment);
}

export function setDefaultTimestamp() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  DOM.logTimestamp.value = now.toISOString().slice(0, 16);
}
