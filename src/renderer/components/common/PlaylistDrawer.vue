<template>
  <n-drawer
    :show="modelValue"
    :width="400"
    placement="right"
    @update:show="$emit('update:modelValue', $event)"
    :unstable-show-mask="false"
    :show-mask="false"
  >
    <n-drawer-content :title="t('comp.playlistDrawer.title')" class="mac-style-drawer">
      <n-scrollbar class="h-full">
        <div class="playlist-drawer">
          <!-- 歌单列表 -->
          <div class="playlist-list">
            <div
              v-for="playlist in playlists"
              :key="playlist.id"
              class="playlist-item"
              @click="handleAddToPlaylist(playlist)"
            >
              <n-image
                :src="getImgUrl(playlist.coverImgUrl || playlist.picUrl, '100y100')"
                class="playlist-item-img"
                preview-disabled
                :img-props="{
                  crossorigin: 'anonymous'
                }"
              />
              <div class="playlist-item-info">
                <div class="playlist-item-name">{{ playlist.name }}</div>
                <div class="playlist-item-count">
                  {{ playlist.trackCount }}
                  {{ t('comp.playlistDrawer.count') }}
                </div>
              </div>
              <div class="playlist-item-action">
                <i class="iconfont ri-add-line"></i>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </n-drawer-content>
  </n-drawer>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { getImgUrl } from '@/utils';

const { t } = useI18n();
const props = defineProps<{
  modelValue: boolean;
  songId?: number;
}>();

const emit = defineEmits(['update:modelValue']);

const message = useMessage();
const playlists = ref<any[]>([]);

// 获取用户歌单
const fetchUserPlaylists = async () => {
  playlists.value = [];
};

// 添加到歌单
const handleAddToPlaylist = async (_playlist: any) => {
  message.error('当前数据源不支持该操作');
};

// 监听显示状态变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      fetchUserPlaylists();
    }
  }
);
</script>

<style lang="scss" scoped>
.mac-style-drawer {
  @apply h-full;

  :deep(.n-drawer-header__main) {
    @apply text-base font-medium;
  }

  :deep(.n-drawer-content) {
    @apply h-full;
  }

  :deep(.n-drawer-content-wrapper) {
    @apply h-full;
  }

  :deep(.n-scrollbar-rail) {
    @apply right-0.5;
  }
}

.playlist-drawer {
  @apply flex flex-col gap-6 py-6;
}

.playlist-list {
  @apply flex flex-col gap-2 pb-40;
}

.playlist-item {
  @apply flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200
         hover:bg-gray-50 dark:hover:bg-gray-800;

  &-img {
    @apply w-10 h-10 rounded-xl;
  }

  &-info {
    @apply flex-1 min-w-0;
  }

  &-name {
    @apply text-sm font-medium truncate;
  }

  &-count {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }

  &-action {
    @apply w-8 h-8 rounded-lg flex items-center justify-center
           text-gray-400 hover:text-green-500 transition-colors duration-200;

    .iconfont {
      @apply text-xl;
    }
  }
}

:deep(.n-drawer-body-content-wrapper) {
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}
</style>
