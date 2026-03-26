<template>
  <div class="search-box flex search-bar">
    <div v-if="showBackButton" class="back-button" @click="goBack">
      <i class="ri-arrow-left-line"></i>
    </div>
    <div class="search-box-input flex-1 relative">
      <n-input
        size="medium"
        round
        placeholder="搜索 Notion 音乐..."
        class="border dark:border-gray-600 border-gray-200"
        readonly
      >
        <template #prefix>
          <i class="iconfont icon-search"></i>
        </template>
      </n-input>
    </div>
    <n-popover trigger="hover" placement="bottom" :show-arrow="false" raw>
      <template #trigger>
        <div class="user-box p-2 cursor-pointer" @click="selectItem('set')">
          <i class="ri-user-3-line"></i>
        </div>
      </template>
      <div class="user-popover">
        <div class="menu-items">
          <div class="menu-item" @click="selectItem('set')">
            <i class="iconfont ri-settings-3-line"></i>
            <span>{{ t('comp.searchBar.set') }}</span>
          </div>
          <div class="menu-item" v-if="isElectron">
            <i class="iconfont ri-zoom-in-line"></i>
            <span>{{ t('comp.searchBar.zoom') }}</span>
            <div class="zoom-controls ml-auto">
              <n-button quaternary circle size="tiny" @click="decreaseZoom">
                <i class="ri-subtract-line"></i>
              </n-button>
              <n-tooltip trigger="hover">
                <template #trigger>
                  <span class="zoom-value" :class="{ 'zoom-100': isZoom100() }" @click="resetZoom"
                    >{{ Math.round(zoomFactor * 100) }}%</span
                  >
                </template>
                {{ isZoom100() ? t('comp.searchBar.zoom100') : t('comp.searchBar.resetZoom') }}
              </n-tooltip>
              <n-button quaternary circle size="tiny" @click="increaseZoom">
                <i class="ri-add-line"></i>
              </n-button>
            </div>
          </div>
          <div class="menu-item">
            <i class="iconfont" :class="isDark ? 'ri-moon-line' : 'ri-sun-line'"></i>
            <span>{{ t('comp.searchBar.theme') }}</span>
            <n-switch v-model:value="isDark" class="ml-auto">
              <template #checked>
                <i class="ri-moon-line"></i>
              </template>
              <template #unchecked>
                <i class="ri-sun-line"></i>
              </template>
            </n-switch>
          </div>
          <div class="menu-item" @click="restartApp">
            <i class="iconfont ri-restart-line"></i>
            <span>{{ t('comp.searchBar.restart') }}</span>
          </div>
          <div class="menu-item" @click="selectItem('refresh')">
            <i class="iconfont ri-refresh-line"></i>
            <span>{{ t('comp.searchBar.refresh') }}</span>
          </div>
        </div>
      </div>
    </n-popover>

    <coffee :alipay-q-r="alipay" :wechat-q-r="wechat">
      <div class="github" @click="toGithub">
        <i class="ri-github-fill"></i>
      </div>
    </coffee>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import alipay from '@/assets/alipay.png';
import wechat from '@/assets/wechat.png';
import Coffee from '@/components/Coffee.vue';
import { useZoom } from '@/hooks/useZoom';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron } from '@/utils';

const router = useRouter();
const settingsStore = useSettingsStore();
const { t } = useI18n();

const { zoomFactor, initZoomFactor, increaseZoom, decreaseZoom, resetZoom, isZoom100 } = useZoom();

const showBackButton = computed(() => {
  return router.currentRoute.value.meta.back === true;
});

const goBack = () => {
  router.back();
};

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};

onMounted(() => {
  isElectron && initZoomFactor();
});

const isDark = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

const selectItem = async (key: string) => {
  switch (key) {
    case 'set':
      router.push('/set');
      break;
    case 'refresh':
      window.location.reload();
      break;
    default:
  }
};

const toGithub = () => {
  window.open('http://donate.alger.fun/download', '_blank');
};
</script>

<style lang="scss" scoped>
.back-button {
  @apply mr-2 flex items-center justify-center text-xl cursor-pointer;
  @apply w-9 h-9 rounded-full;
  @apply bg-light-100 dark:bg-dark-100 text-gray-900 dark:text-white;
  @apply border dark:border-gray-600 border-gray-200;
  @apply hover:bg-light-200 dark:hover:bg-dark-200;
  @apply transition-all duration-200;
}

.user-box {
  @apply ml-4 flex text-lg justify-center items-center rounded-full transition-colors duration-200;
  @apply border dark:border-gray-600 border-gray-200 hover:border-gray-400 dark:hover:border-gray-400;
  @apply bg-light dark:bg-gray-800;
}

.search-box {
  @apply pb-4 pr-4;
}

.search-box-input {
  @apply relative;

  :deep(.n-input) {
    @apply bg-gray-50 dark:bg-black;

    .n-input__input-el {
      @apply text-gray-900 dark:text-white;
    }

    .n-input__prefix {
      @apply text-gray-500 dark:text-gray-400;
    }
  }
}

.mobile {
  .search-box {
    @apply pl-4;
  }
}

.github {
  @apply cursor-pointer text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400 text-xl ml-4 rounded-full flex justify-center items-center px-2 h-full;
  @apply border dark:border-gray-600 border-gray-200 bg-light dark:bg-black;
}

.user-popover {
  @apply min-w-[220px] p-0 rounded-xl overflow-hidden;
  @apply bg-light dark:bg-black;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .menu-items {
    @apply py-1;

    .menu-item {
      @apply flex items-center px-3 py-1 text-sm cursor-pointer;
      @apply text-gray-700 dark:text-gray-300;
      transition: background-color 0.2s;

      &:hover {
        @apply bg-gray-100 dark:bg-gray-700;
      }

      i {
        @apply mr-1 text-lg text-gray-500 dark:text-gray-400;
      }

      .zoom-controls {
        @apply flex items-center gap-1;

        .zoom-value {
          @apply text-xs px-2 py-0.5 rounded cursor-pointer;
          @apply bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300;
          @apply hover:bg-gray-200 dark:hover:bg-gray-600;
          transition: all 0.2s ease;

          &.zoom-100 {
            @apply bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-bold;
            @apply hover:bg-green-200 dark:hover:bg-green-800;
          }
        }
      }
    }
  }
}
</style>
