import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

if (import.meta.env.DEV) {
  document.addEventListener(
    'unpo:development-content',
    (event) => {
      const panelProps = (event as CustomEvent).detail;
      void import('./components/DevelopmentPanel.vue').then(({ default: panel }) => {
        const container = document.createElement('div');
        container.className = 'dev-panel-host';
        document.body.prepend(container);
        createApp(panel, panelProps).mount(container);
      });
    },
    { once: true },
  );
}

createApp(App).mount('#app');
