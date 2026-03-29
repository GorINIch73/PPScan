import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue')
  },
  {
    path: '/scan',
    name: 'scan',
    component: () => import('@/pages/ScanPage.vue')
  },
  {
    path: '/edit/:id?',
    name: 'edit',
    component: () => import('@/pages/EditPage.vue')
  },
  {
    path: '/detail/:id',
    name: 'detail',
    component: () => import('@/pages/DetailPage.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
