import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Signup from './pages/Signup.vue';
import Login from './pages/Login.vue';
import BbsPost from './pages/BbsPost.vue';
import { MENUS } from './menus.js';

const routes = [
  { path: '/', component: Home },
  { path: '/signup', component: Signup },
  { path: '/login', component: Login },
  { path: '/bbs/:id', component: BbsPost },
  ...MENUS.filter(m => m.component).map(({ path, component }) => ({ path, component })),
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
