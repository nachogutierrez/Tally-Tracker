import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

function Loading() {
  return html`
    <div class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  `;
}

export default Loading;