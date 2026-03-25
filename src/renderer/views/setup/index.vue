<template>
  <div class="setup-page">
    <div class="setup-card">
      <div class="setup-icon">
        <i class="iconfont icon-recordfill"></i>
      </div>
      <h1 class="setup-title">Notion Music Player</h1>
      <p class="setup-desc">输入你的 Notion 配置，从 Notion 数据库中加载 Apple Music 歌曲</p>

      <div class="setup-form">
        <div class="form-group">
          <label>Notion Token</label>
          <input
            v-model="notionToken"
            type="password"
            placeholder="ntn_xxxxxxxxxxxxx"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>歌曲数据库 ID</label>
          <input
            v-model="databaseId"
            type="text"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            class="form-input"
          />
        </div>

        <button
          class="setup-btn"
          :disabled="!notionToken || !databaseId || loading"
          @click="handleSubmit"
        >
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else>连接 Notion</span>
        </button>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

defineOptions({ name: 'Setup' });

const router = useRouter();
const notionToken = ref(localStorage.getItem('notion_token') || '');
const databaseId = ref(localStorage.getItem('notion_database_id') || '');
const loading = ref(false);
const errorMsg = ref('');

const handleSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';

  try {
    const apiBase = import.meta.env.VITE_API || 'http://127.0.0.1:30488';
    console.log('API Base:', apiBase);

    // Send config to server
    const res = await axios.post(`${apiBase}/api/config`, {
      notionToken: notionToken.value,
      databaseId: databaseId.value
    });

    if (res.data?.code === 200) {
      // Save to localStorage
      localStorage.setItem('notion_token', notionToken.value);
      localStorage.setItem('notion_database_id', databaseId.value);

      // Navigate to main page immediately, refresh in background
      router.push('/');

      // Pre-load songs in background (don't block navigation)
      axios.post(`${apiBase}/api/refresh`, null, { timeout: 120000 }).catch((e) => {
        console.warn('Pre-load failed, will load on demand:', e);
      });
    } else {
      errorMsg.value = res.data?.message || '连接失败';
    }
  } catch (e: any) {
    console.error('Setup error:', e);
    errorMsg.value = e.message || '无法连接到服务器，请确保服务器已启动';
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.setup-page {
  @apply w-full h-full flex items-center justify-center;
  @apply bg-light dark:bg-black;
}

.setup-card {
  @apply flex flex-col items-center p-8 rounded-2xl max-w-md w-full mx-4;
  @apply bg-white dark:bg-gray-900;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

.setup-icon {
  @apply text-6xl mb-4;
  @apply text-green-500;
}

.setup-title {
  @apply text-2xl font-bold mb-2;
  @apply text-gray-900 dark:text-white;
}

.setup-desc {
  @apply text-sm text-center mb-6;
  @apply text-gray-500 dark:text-gray-400;
}

.setup-form {
  @apply w-full;
}

.form-group {
  @apply mb-4;

  label {
    @apply block text-sm font-medium mb-1;
    @apply text-gray-700 dark:text-gray-300;
  }
}

.form-input {
  @apply w-full px-3 py-2 rounded-lg text-sm;
  @apply bg-gray-50 dark:bg-gray-800;
  @apply border border-gray-200 dark:border-gray-700;
  @apply text-gray-900 dark:text-white;
  @apply focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent;
  transition: all 0.2s;
}

.setup-btn {
  @apply w-full py-2.5 rounded-lg text-white font-medium mt-2;
  @apply bg-green-500 hover:bg-green-600;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
  @apply flex items-center justify-center;
  transition: all 0.2s;
}

.loading-spinner {
  @apply inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-msg {
  @apply text-red-500 text-sm mt-3 text-center;
}
</style>
