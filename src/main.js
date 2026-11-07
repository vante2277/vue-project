import { createApp } from 'vue';
import App from './App.vue';
import router from './router.js';
import './styles/global.css';

// index.html 의 <div id="root"> 에 붙입니다. (global.css 가 #root 기준으로 레이아웃을 잡음)
createApp(App).use(router).mount('#root');
