<template>
  <div class="download-drawer-trigger">
    <n-badge :value="downloadingCount" :max="99" :show="downloadingCount > 0">
      <n-button circle @click="navigateToDownloads">
        <template #icon>
          <i class="iconfont ri-download-cloud-2-line"></i>
        </template>
      </n-button>
    </n-badge>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const downloadList = ref<any[]>([]);

const downloadingCount = computed(() => {
  return downloadList.value.filter((item) => item.status === 'downloading').length;
});

const navigateToDownloads = () => {
  router.push('/downloads');
};

onMounted(() => {
  window.electron.ipcRenderer.on('music-download-progress', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);

    if (data.progress === 100) {
      data.status = 'completed';
    }

    if (existingItem) {
      Object.assign(existingItem, {
        ...data,
        songInfo: data.songInfo || existingItem.songInfo,
      });

      if (data.status === 'completed') {
        downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
      }
    } else {
      downloadList.value.push({
        ...data,
        songInfo: data.songInfo,
      });
    }
  });

  window.electron.ipcRenderer.on('music-download-complete', async (_, data) => {
    if (data.success) {
      downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
    } else {
      const existingItem = downloadList.value.find((item) => item.filename === data.filename);
      if (existingItem) {
        Object.assign(existingItem, {
          status: 'error',
          error: data.error,
          progress: 0,
        });
        setTimeout(() => {
          downloadList.value = downloadList.value.filter((item) => item.filename !== data.filename);
        }, 3000);
      }
    }
  });

  window.electron.ipcRenderer.on('music-download-queued', (_, data) => {
    const existingItem = downloadList.value.find((item) => item.filename === data.filename);
    if (!existingItem) {
      downloadList.value.push({
        filename: data.filename,
        progress: 0,
        loaded: 0,
        total: 0,
        path: '',
        status: 'downloading',
        songInfo: data.songInfo,
      });
    }
  });
});
</script>

<style lang="scss" scoped>
.download-drawer-trigger {
  @apply fixed left-6 bottom-24 z-[999];

  .n-button {
    @apply bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm;
    @apply hover:bg-light dark:hover:bg-dark-200;
    @apply text-gray-600 dark:text-gray-300;
    @apply transition-all duration-300;
    @apply w-10 h-10;

    .iconfont {
      @apply text-xl;
    }
  }
}
</style>
