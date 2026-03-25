const otherRouter = [
  {
    path: '/music-list/:id?',
    name: 'musicList',
    meta: {
      title: '音乐列表',
      keepAlive: false,
      showInMenu: false,
      back: true
    },
    component: () => import('@/views/music/MusicListPage.vue')
  },
  {
    path: '/setup',
    name: 'setup',
    meta: {
      title: '设置数据源',
      keepAlive: false,
      showInMenu: false,
      back: false
    },
    component: () => import('@/views/setup/index.vue')
  }
];
export default otherRouter;
