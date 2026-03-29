import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Quasar, Notify, Dialog, Loading } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/dist/quasar.css';
import router from './router';
import App from './App.vue';
import './styles/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(Quasar, {
  plugins: {
    Notify,
    Dialog,
    Loading
  },
  config: {
    brand: {
      primary: '#1976D2',
      secondary: '#424242',
      accent: '#4CAF50',
      positive: '#4CAF50',
      negative: '#F44336',
      info: '#2196F3',
      warning: '#FF9800'
    }
  }
});

app.mount('#app');
