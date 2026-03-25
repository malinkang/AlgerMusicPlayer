import { createRouter, createWebHashHistory } from 'vue-router';

import AppLayout from '@/layout/AppLayout.vue';
import MiniLayout from '@/layout/MiniLayout.vue';
import homeRouter from '@/router/home';
import otherRouter from '@/router/other';
import { useSettingsStore } from '@/store/modules/settings';

// 由于 Vue Router 守卫在创建前不能直接使用组合式 API
// 我们创建一个辅助函数来获取 store 实例
let _settingsStore: ReturnType<typeof useSettingsStore> | null = null;
const getSettingsStore = () => {
  if (!_settingsStore) {
    _settingsStore = useSettingsStore();
  }
  return _settingsStore;
};

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [...homeRouter, ...otherRouter]
  },
  {
    path: '/lyric',
    component: () => import('@/views/lyric/index.vue')
  },
  {
    path: '/mini',
    component: MiniLayout
  }
];

const router = createRouter({
  routes,
  history: createWebHashHistory()
});

// 添加全局前置守卫
router.beforeEach((to, _, next) => {
  const settingsStore = getSettingsStore();

  // 如果是迷你模式
  if (settingsStore.isMiniMode) {
    if (to.path === '/mini') {
      next();
    } else {
      next(false);
    }
  } else if (to.path === '/mini') {
    next('/');
  } else {
    // Check if Notion config exists
    const notionToken = localStorage.getItem('notion_token');
    const databaseId = localStorage.getItem('notion_database_id');
    if (!notionToken || !databaseId) {
      if (to.path !== '/setup') {
        next('/setup');
        return;
      }
    }
    next();
  }
});

export default router;
