import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

if (import.meta.env.DEV) {
  document.addEventListener(
    'unpo:development-content',
    (event) => {
      const { exercises } = (event as CustomEvent).detail;
      void import('./components/DevelopmentPanel.vue').then(({ default: panel }) => {
        const container = document.createElement('div');
        document.body.append(container);
        createApp(panel, { exercises }).mount(container);
      });
    },
    { once: true },
  );
}

createApp(App).mount('#app');
