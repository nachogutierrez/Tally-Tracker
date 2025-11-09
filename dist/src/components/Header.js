import { h } from 'preact';
import htm from 'htm';
import { useAuth } from '../auth.js';

const html = htm.bind(h);

function Header() {
  const { user, signOut } = useAuth();

  return html`
    <header class="bg-white dark:bg-gray-800 shadow-md">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">TallyTracker</h1>
          <div class="flex items-center">
            <img src=${user.picture} alt="user avatar" class="w-8 h-8 rounded-full mr-2" />
            <button
              onClick=${signOut}
              class="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export default Header;