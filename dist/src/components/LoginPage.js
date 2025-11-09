import { h } from 'preact';
import htm from 'htm';
import { useAuth } from '../auth.js';

const html = htm.bind(h);

function LoginPage() {
  const { signIn } = useAuth();

  return html`
    <div class="flex flex-col items-center justify-center h-full text-center p-4">
      <h1 class="text-4xl font-bold text-gray-800 dark:text-white mb-4">TallyTracker</h1>
      <p class="text-gray-600 dark:text-gray-300 mb-8">
        Please sign in with your Google account to continue.
      </p>
      <button
        onClick=${signIn}
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
      >
        Sign In with Google
      </button>
    </div>
  `;
}

export default LoginPage;