import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

const NavItem = ({ active, onClick, icon, label }) => {
  const activeClasses = 'text-indigo-600 dark:text-indigo-400';
  const inactiveClasses = 'text-gray-500 dark:text-gray-400';

  return html`
    <button onClick=${onClick} class="flex flex-col items-center justify-center w-full pt-2 pb-1 focus:outline-none">
      <svg class="w-6 h-6 mb-1 ${active ? activeClasses : inactiveClasses}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        ${icon}
      </svg>
      <span class="text-xs ${active ? activeClasses : inactiveClasses}">${label}</span>
    </button>
  `;
};

function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: 'log',
      label: 'Log',
      icon: html`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>`,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: html`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`,
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: html`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>`,
    },
  ];

  return html`
    <nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 flex">
      ${navItems.map(item => html`
        <${NavItem}
          key=${item.id}
          active=${activeTab === item.id}
          onClick=${() => setActiveTab(item.id)}
          icon=${item.icon}
          label=${item.label}
        />
      `)}
    </nav>
  `;
}

export default BottomNav;