import { render, h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

import { AuthProvider, useAuth } from './auth.js';
import { ApiProvider, useApi } from './api.js';
import BottomNav from './components/BottomNav.js';
import Categories from './components/Categories.js';
import Insights from './components/Insights.js';
import Log from './components/Log.js';
import Loading from './components/Loading.js';
import LoginPage from './components/LoginPage.js';
import Header from './components/Header.js';

const html = htm.bind(h);

function App() {
  const { user, loading: authLoading } = useAuth();
  const { data, loading: apiLoading } = useApi();
  const [activeTab, setActiveTab] = useState('log');

  if (authLoading || (user && apiLoading)) {
    return html`<${Loading} />`;
  }

  if (!user) {
    return html`<${LoginPage} />`;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'insights':
        return html`<${Insights} data=${data} />`;
      case 'categories':
        return html`<${Categories} data=${data} />`;
      case 'log':
      default:
        return html`<${Log} data=${data} />`;
    }
  };

  return html`
    <div class="flex flex-col h-full">
      <${Header} />
      <main class="flex-grow p-4 pb-24">
        ${renderActiveTab()}
      </main>
      <${BottomNav} activeTab=${activeTab} setActiveTab=${setActiveTab} />
    </div>
  `;
}

function AppWrapper() {
  return html`
    <${AuthProvider}>
      <${ApiProvider}>
        <${App} />
      </${ApiProvider}>
    <//>
  `;
}

render(html`<${AppWrapper} />`, document.getElementById('app'));