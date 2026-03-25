const layoutRouter = [
  {
    path: '/',
    name: 'list',
    meta: {
      title: 'comp.list',
      icon: 'icon-Paper',
      keepAlive: true,
      isMobile: true
    },
    component: () => import('@/views/list/index.vue')
  },
  {
    path: '/set',
    name: 'set',
    meta: {
      title: 'comp.settings',
      icon: 'ri-settings-3-fill',
      keepAlive: true,
      noScroll: true,
      back: true
    },
    component: () => import('@/views/set/index.vue')
  }
];
export default layoutRouter;
