<template>
  <div class="flex h-full">
    <!-- 左侧导航栏 -->
    <setting-nav
      v-if="!isMobile"
      :sections="navSections"
      :current-section="currentSection"
      @navigate="scrollToSection"
    />

    <!-- 右侧内容区 -->
    <n-scrollbar ref="scrollbarRef" class="flex-1 h-full" @scroll="handleScroll">
      <div class="p-4 pb-20 max-md:p-3 max-md:pb-24">
        <!-- 基础设置 -->
        <setting-section
          id="basic"
          :title="t('settings.sections.basic')"
          @ref="(el) => (sectionRefs.basic = el as HTMLElement | null)"
        >
          <!-- 主题设置 -->
          <setting-item
            :title="t('settings.basic.themeMode')"
            :description="t('settings.basic.themeModeDesc')"
          >
            <template #action>
              <div class="flex items-center gap-3 max-md:flex-wrap">
                <div class="flex items-center gap-2">
                  <n-switch v-model:value="setData.autoTheme" @update:value="handleAutoThemeChange">
                    <template #checked><i class="ri-smartphone-line"></i></template>
                    <template #unchecked><i class="ri-settings-line"></i></template>
                  </n-switch>
                  <span class="text-sm text-gray-500 max-md:hidden">
                    {{
                      setData.autoTheme
                        ? t('settings.basic.autoTheme')
                        : t('settings.basic.manualTheme')
                    }}
                  </span>
                </div>
                <n-switch
                  v-model:value="isDarkTheme"
                  :disabled="setData.autoTheme"
                  :class="{ 'opacity-50': setData.autoTheme }"
                >
                  <template #checked><i class="ri-moon-line"></i></template>
                  <template #unchecked><i class="ri-sun-line"></i></template>
                </n-switch>
              </div>
            </template>
          </setting-item>

          <!-- 语言设置 -->
          <setting-item
            :title="t('settings.basic.language')"
            :description="t('settings.basic.languageDesc')"
          >
            <language-switcher />
          </setting-item>

          <!-- 平板模式 -->
          <setting-item
            v-if="!isElectron"
            :title="t('settings.basic.tabletMode')"
            :description="t('settings.basic.tabletModeDesc')"
          >
            <n-switch v-model:value="setData.tabletMode">
              <template #checked><i class="ri-tablet-line"></i></template>
              <template #unchecked><i class="ri-smartphone-line"></i></template>
            </n-switch>
          </setting-item>

          <!-- 翻译引擎 -->
          <setting-item
            :title="t('settings.translationEngine')"
            :description="t('settings.translationEngine')"
          >
            <n-select
              v-model:value="setData.lyricTranslationEngine"
              :options="translationEngineOptions"
              class="w-40 max-md:w-full"
            />
          </setting-item>

          <!-- 字体设置 -->
          <setting-item
            v-if="isElectron"
            :title="t('settings.basic.font')"
            :description="t('settings.basic.fontDesc')"
          >
            <template #action>
              <div class="flex gap-2 max-md:flex-col max-md:w-full">
                <n-radio-group v-model:value="setData.fontScope" class="mt-2">
                  <n-radio key="global" value="global">{{
                    t('settings.basic.fontScope.global')
                  }}</n-radio>
                  <n-radio key="lyric" value="lyric">{{
                    t('settings.basic.fontScope.lyric')
                  }}</n-radio>
                </n-radio-group>
                <n-select
                  v-model:value="selectedFonts"
                  :options="systemFonts"
                  filterable
                  multiple
                  placeholder="选择字体"
                  class="w-[300px] max-md:w-full"
                  :render-label="renderFontLabel"
                />
              </div>
            </template>
          </setting-item>

          <!-- 字体预览 -->
          <div
            v-if="selectedFonts.length > 0"
            class="mt-4 p-4 max-md:p-3 rounded-lg bg-gray-50 dark:bg-dark-100 border border-gray-200 dark:border-gray-700"
          >
            <div class="text-sm font-medium mb-3 text-gray-600 dark:text-gray-300">
              {{ t('settings.basic.fontPreview.title') }}
            </div>
            <div class="space-y-3" :style="{ fontFamily: setData.fontFamily }">
              <div v-for="preview in fontPreviews" :key="preview.key" class="flex flex-col gap-1">
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t(`settings.basic.fontPreview.${preview.key}`) }}
                </div>
                <div
                  class="text-base text-gray-900 dark:text-gray-100 p-2 rounded bg-white dark:bg-dark border border-gray-200 dark:border-gray-700"
                >
                  {{ t(`settings.basic.fontPreview.${preview.key}Text`) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 动画设置 -->
          <setting-item :title="t('settings.basic.animation')">
            <template #description>
              <div class="flex items-center gap-2">
                <n-switch v-model:value="setData.noAnimate">
                  <template #checked>{{ t('common.off') }}</template>
                  <template #unchecked>{{ t('common.on') }}</template>
                </n-switch>
                <span>{{ t('settings.basic.animationDesc') }}</span>
              </div>
            </template>
            <template #action>
              <div class="flex items-center gap-2">
                <span v-if="!isMobile" class="text-sm text-gray-400"
                  >{{ setData.animationSpeed }}x</span
                >
                <div class="w-40 max-md:w-auto flex justify-end">
                  <n-slider
                    v-if="!isMobile"
                    v-model:value="setData.animationSpeed"
                    :min="0.1"
                    :max="3"
                    :step="0.1"
                    :marks="animationSpeedMarks"
                    :disabled="setData.noAnimate"
                  />
                  <n-input-number
                    v-else
                    v-model:value="setData.animationSpeed"
                    :min="0.1"
                    :max="3"
                    :step="0.1"
                    :disabled="setData.noAnimate"
                    button-placement="both"
                    class="w-[100px]"
                  />
                </div>
              </div>
            </template>
          </setting-item>

          <!-- GPU加速 -->
          <setting-item v-if="isElectron" :title="t('settings.basic.gpuAcceleration')">
            <template #description>
              <div class="text-sm text-gray-500 mb-2">
                {{ t('settings.basic.gpuAccelerationDesc') }}
              </div>
              <div v-if="gpuAccelerationChanged" class="text-xs text-amber-500">
                <i class="ri-information-line mr-1"></i>
                {{ t('settings.basic.gpuAccelerationRestart') }}
              </div>
            </template>
            <n-switch
              v-model:value="setData.enableGpuAcceleration"
              @update:value="handleGpuAccelerationChange"
            >
              <template #checked><i class="ri-cpu-line"></i></template>
              <template #unchecked><i class="ri-cpu-line"></i></template>
            </n-switch>
          </setting-item>
        </setting-section>

        <!-- Notion 配置 -->
        <setting-section
          id="notion"
          title="Notion 配置"
          @ref="(el) => (sectionRefs.notion = el as HTMLElement | null)"
        >
          <setting-item title="数据库 ID" :description="notionDatabaseId || '未配置'">
            <template #action>
              <n-button size="small" @click="reconfigureNotion">重新配置</n-button>
            </template>
          </setting-item>
          <setting-item title="刷新数据" description="从 Notion 重新加载歌曲数据">
            <template #action>
              <n-button size="small" :loading="refreshingNotion" @click="refreshNotionData"
                >刷新</n-button
              >
            </template>
          </setting-item>
        </setting-section>

        <!-- 播放设置 -->
        <setting-section
          id="playback"
          :title="t('settings.sections.playback')"
          @ref="(el) => (sectionRefs.playback = el as HTMLElement | null)"
        >
          <!-- 音质设置 -->
          <setting-item
            :title="t('settings.playback.quality')"
            :description="t('settings.playback.qualityDesc')"
          >
            <n-select
              v-model:value="setData.musicQuality"
              :options="qualityOptions"
              class="w-40 max-md:w-full"
            />
          </setting-item>

          <!-- 自动播放 -->
          <setting-item
            :title="t('settings.playback.autoPlay')"
            :description="t('settings.playback.autoPlayDesc')"
          >
            <n-switch v-model:value="setData.autoPlay">
              <template #checked>{{ t('common.on') }}</template>
              <template #unchecked>{{ t('common.off') }}</template>
            </n-switch>
          </setting-item>
        </setting-section>

        <!-- 应用设置 -->
        <setting-section
          v-if="isElectron"
          id="application"
          :title="t('settings.sections.application')"
          @ref="(el) => (sectionRefs.application = el as HTMLElement | null)"
        >
          <!-- 关闭行为 -->
          <setting-item
            :title="t('settings.application.closeAction')"
            :description="t('settings.application.closeActionDesc')"
          >
            <n-select
              v-model:value="setData.closeAction"
              :options="closeActionOptions"
              class="w-40 max-md:w-full"
            />
          </setting-item>

          <!-- 快捷键 -->
          <setting-item
            :title="t('settings.application.shortcut')"
            :description="t('settings.application.shortcutDesc')"
          >
            <n-button size="small" @click="showShortcutModal = true">{{
              t('common.configure')
            }}</n-button>
          </setting-item>

          <!-- 下载管理 -->
          <setting-item v-if="isElectron" :title="t('settings.application.download')">
            <template #description>
              <n-switch v-model:value="setData.alwaysShowDownloadButton" class="mr-2">
                <template #checked>{{ t('common.show') }}</template>
                <template #unchecked>{{ t('common.hide') }}</template>
              </n-switch>
              {{ t('settings.application.downloadDesc') }}
            </template>
            <n-button size="small" @click="settingsStore.showDownloadDrawer = true">
              {{ t('settings.application.download') }}
            </n-button>
          </setting-item>

          <!-- 无限下载 -->
          <setting-item :title="t('settings.application.unlimitedDownload')">
            <template #description>
              <n-switch v-model:value="setData.unlimitedDownload" class="mr-2">
                <template #checked>{{ t('common.on') }}</template>
                <template #unchecked>{{ t('common.off') }}</template>
              </n-switch>
              {{ t('settings.application.unlimitedDownloadDesc') }}
            </template>
          </setting-item>

          <!-- 下载路径 -->
          <setting-item :title="t('settings.application.downloadPath')">
            <template #description>
              <span class="break-all">{{
                setData.downloadPath || t('settings.application.downloadPathDesc')
              }}</span>
            </template>
            <template #action>
              <div class="flex items-center gap-2">
                <n-button size="small" @click="openDownloadPath">{{ t('common.open') }}</n-button>
                <n-button size="small" @click="selectDownloadPath">{{
                  t('common.modify')
                }}</n-button>
              </div>
            </template>
          </setting-item>

          <!-- 远程控制 -->
          <setting-item
            :title="t('settings.application.remoteControl')"
            :description="t('settings.application.remoteControlDesc')"
          >
            <n-button size="small" @click="showRemoteControlModal = true">{{
              t('common.configure')
            }}</n-button>
          </setting-item>
        </setting-section>

        <!-- 网络设置 -->
        <setting-section
          v-if="isElectron"
          id="network"
          :title="t('settings.sections.network')"
          @ref="(el) => (sectionRefs.network = el as HTMLElement | null)"
        >
          <!-- API端口 -->
          <setting-item
            :title="t('settings.network.apiPort')"
            :description="t('settings.network.apiPortDesc')"
          >
            <n-input-number v-model:value="setData.musicApiPort" class="max-md:w-32" />
          </setting-item>

          <!-- 代理设置 -->
          <setting-item
            :title="t('settings.network.proxy')"
            :description="t('settings.network.proxyDesc')"
          >
            <template #action>
              <div class="flex items-center gap-2">
                <n-switch v-model:value="setData.proxyConfig.enable">
                  <template #checked>{{ t('common.on') }}</template>
                  <template #unchecked>{{ t('common.off') }}</template>
                </n-switch>
                <n-button size="small" @click="showProxyModal = true">{{
                  t('common.configure')
                }}</n-button>
              </div>
            </template>
          </setting-item>

          <!-- 真实IP -->
          <setting-item
            :title="t('settings.network.realIP')"
            :description="t('settings.network.realIPDesc')"
          >
            <template #action>
              <div class="flex items-center gap-2 max-md:flex-wrap">
                <n-switch v-model:value="setData.enableRealIP">
                  <template #checked>{{ t('common.on') }}</template>
                  <template #unchecked>{{ t('common.off') }}</template>
                </n-switch>
                <n-input
                  v-if="setData.enableRealIP"
                  v-model:value="setData.realIP"
                  placeholder="realIP"
                  class="w-[200px] max-md:w-full"
                  @blur="validateAndSaveRealIP"
                />
              </div>
            </template>
          </setting-item>
        </setting-section>

        <!-- 系统管理 -->
        <setting-section
          v-if="isElectron"
          id="system"
          :title="t('settings.sections.system')"
          @ref="(el) => (sectionRefs.system = el as HTMLElement | null)"
        >
          <!-- 清除缓存 -->
          <setting-item
            :title="t('settings.system.cache')"
            :description="t('settings.system.cacheDesc')"
          >
            <n-button size="small" @click="showClearCacheModal = true">{{
              t('settings.system.cacheDesc')
            }}</n-button>
          </setting-item>

          <!-- 重启应用 -->
          <setting-item
            :title="t('settings.system.restart')"
            :description="t('settings.system.restartDesc')"
          >
            <n-button size="small" @click="restartApp">{{ t('settings.system.restart') }}</n-button>
          </setting-item>
        </setting-section>

        <!-- 关于 -->
        <setting-section
          id="about"
          :title="t('settings.sections.about')"
          @ref="(el) => (sectionRefs.about = el as HTMLElement | null)"
        >
          <!-- 版本信息 -->
          <setting-item :title="t('settings.about.version')">
            <template #description>
              {{ updateInfo.currentVersion }}
              <n-tag v-if="updateInfo.hasUpdate" type="success" class="ml-2">
                {{ t('settings.about.hasUpdate') }} {{ updateInfo.latestVersion }}
              </n-tag>
            </template>
            <template #action>
              <div class="flex items-center gap-2 flex-wrap">
                <n-button size="small" :loading="checking" @click="checkForUpdates(true)">
                  {{ checking ? t('settings.about.checking') : t('settings.about.checkUpdate') }}
                </n-button>
              </div>
            </template>
          </setting-item>
        </setting-section>
      </div>
      <play-bottom />
    </n-scrollbar>

    <!-- 弹窗组件 -->
    <template v-if="isElectron">
      <shortcut-settings v-model:show="showShortcutModal" @change="handleShortcutsChange" />
      <proxy-settings
        v-model:show="showProxyModal"
        :config="proxyForm"
        @confirm="handleProxyConfirm"
      />
      <remote-control-setting v-model:visible="showRemoteControlModal" />
    </template>

    <clear-cache-settings v-model:show="showClearCacheModal" @confirm="clearCache" />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { useMessage } from 'naive-ui';
import { computed, h, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import localData from '@/../main/set.json';
import PlayBottom from '@/components/common/PlayBottom.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import ClearCacheSettings from '@/components/settings/ClearCacheSettings.vue';
import ProxySettings from '@/components/settings/ProxySettings.vue';
import RemoteControlSetting from '@/components/settings/ServerSetting.vue';
import ShortcutSettings from '@/components/settings/ShortcutSettings.vue';
import { useSettingsStore } from '@/store/modules/settings';
import { isElectron, isMobile } from '@/utils';
import { openDirectory, selectDirectory } from '@/utils/fileOperation';
import request from '@/utils/request';
import { checkUpdate, UpdateResult } from '@/utils/update';

import config from '../../../../package.json';
import SettingItem from './SettingItem.vue';
import SettingNav from './SettingNav.vue';
import SettingSection from './SettingSection.vue';

// ==================== 常量配置 ====================
const fontPreviews = [
  { key: 'chinese' },
  { key: 'english' },
  { key: 'japanese' },
  { key: 'korean' }
];

// ==================== 平台和Store ====================
const settingsStore = useSettingsStore();
const message = useMessage();
const { t } = useI18n();
const router = useRouter();

// ==================== Notion 配置 ====================
const notionDatabaseId = ref(localStorage.getItem('notion_database_id') || '');
const refreshingNotion = ref(false);

const reconfigureNotion = () => {
  localStorage.removeItem('notion_token');
  localStorage.removeItem('notion_database_id');
  router.push('/setup');
};

const refreshNotionData = async () => {
  refreshingNotion.value = true;
  try {
    const res = await request.post('/api/refresh');
    if (res.data?.code === 200) {
      message.success(`已刷新，共 ${res.data.count} 首歌曲`);
    } else {
      message.error(res.data?.message || '刷新失败');
    }
  } catch (e: any) {
    message.error(e.message || '刷新失败');
  } finally {
    refreshingNotion.value = false;
  }
};

// ==================== 设置数据管理 ====================
const saveSettings = useDebounceFn((data) => {
  settingsStore.setSetData(data);
}, 500);

const localSetData = ref({ ...settingsStore.setData });

const setData = computed({
  get: () => localSetData.value,
  set: (newData) => {
    localSetData.value = newData;
  }
});

watch(
  () => localSetData.value,
  (newValue) => saveSettings(newValue),
  { deep: true }
);

watch(
  () => settingsStore.setData,
  (newValue) => {
    if (JSON.stringify(localSetData.value) !== JSON.stringify(newValue)) {
      localSetData.value = { ...newValue };
    }
  },
  { deep: true, immediate: true }
);

onUnmounted(() => {
  settingsStore.setSetData(localSetData.value);
});

// ==================== 选项配置 ====================
const translationEngineOptions = computed(() => [
  { label: t('settings.translationEngineOptions.none'), value: 'none' },
  { label: t('settings.translationEngineOptions.opencc'), value: 'opencc' }
]);

const qualityOptions = computed(() => [
  { label: t('settings.playback.qualityOptions.standard'), value: 'standard' },
  { label: t('settings.playback.qualityOptions.higher'), value: 'higher' },
  { label: t('settings.playback.qualityOptions.exhigh'), value: 'exhigh' },
  { label: t('settings.playback.qualityOptions.lossless'), value: 'lossless' },
  { label: t('settings.playback.qualityOptions.hires'), value: 'hires' },
  { label: t('settings.playback.qualityOptions.jyeffect'), value: 'jyeffect' },
  { label: t('settings.playback.qualityOptions.sky'), value: 'sky' },
  { label: t('settings.playback.qualityOptions.dolby'), value: 'dolby' },
  { label: t('settings.playback.qualityOptions.jymaster'), value: 'jymaster' }
]);

const closeActionOptions = computed(() => [
  { label: t('settings.application.closeOptions.ask'), value: 'ask' },
  { label: t('settings.application.closeOptions.minimize'), value: 'minimize' },
  { label: t('settings.application.closeOptions.close'), value: 'close' }
]);

const animationSpeedMarks = computed(() => ({
  0.1: t('settings.basic.animationSpeed.slow'),
  1: t('settings.basic.animationSpeed.normal'),
  3: t('settings.basic.animationSpeed.fast')
}));

// ==================== 主题设置 ====================
const isDarkTheme = computed({
  get: () => settingsStore.theme === 'dark',
  set: () => settingsStore.toggleTheme()
});

const handleAutoThemeChange = (value: boolean) => {
  settingsStore.setAutoTheme(value);
};

// ==================== GPU加速 ====================
const gpuAccelerationChanged = ref(false);

const handleGpuAccelerationChange = (enabled: boolean) => {
  try {
    if (window.electron) {
      window.electron.ipcRenderer.send('update-gpu-acceleration', enabled);
      gpuAccelerationChanged.value = true;
      message.info(t('settings.basic.gpuAccelerationChangeSuccess'));
    }
  } catch (error) {
    console.error('GPU加速设置更新失败:', error);
    message.error(t('settings.basic.gpuAccelerationChangeError'));
  }
};

// ==================== 更新检查 ====================
const checking = ref(false);
const updateInfo = ref<UpdateResult>({
  hasUpdate: false,
  latestVersion: '',
  currentVersion: config.version,
  releaseInfo: null
});

const checkForUpdates = async (isClick = false) => {
  checking.value = true;
  try {
    const result = await checkUpdate(config.version);
    if (result) {
      updateInfo.value = result;
      if (!result.hasUpdate && isClick) {
        message.success(t('settings.about.latest'));
      }
    } else if (isClick) {
      message.success(t('settings.about.latest'));
    }
  } catch (error) {
    console.error('检查更新失败:', error);
    if (isClick) {
      message.error(t('settings.about.messages.checkError'));
    }
  } finally {
    checking.value = false;
  }
};

const restartApp = () => {
  window.electron.ipcRenderer.send('restart');
};

// ==================== 下载路径 ====================
const selectDownloadPath = async () => {
  const path = await selectDirectory(message);
  if (path) {
    setData.value = { ...setData.value, downloadPath: path };
  }
};

const openDownloadPath = () => {
  openDirectory(setData.value.downloadPath, message);
};

// ==================== 代理设置 ====================
const showProxyModal = ref(false);
const proxyForm = ref({ protocol: 'http', host: '127.0.0.1', port: 7890 });

watch(
  () => setData.value.proxyConfig,
  (newVal) => {
    if (newVal) {
      proxyForm.value = {
        protocol: newVal.protocol || 'http',
        host: newVal.host || '127.0.0.1',
        port: newVal.port || 7890
      };
    }
  },
  { immediate: true, deep: true }
);

const handleProxyConfirm = async (proxyConfig: any) => {
  setData.value = {
    ...setData.value,
    proxyConfig: { enable: setData.value.proxyConfig?.enable || false, ...proxyConfig }
  };
  message.success(t('settings.network.messages.proxySuccess'));
};

const validateAndSaveRealIP = () => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!setData.value.realIP || ipRegex.test(setData.value.realIP)) {
    setData.value = { ...setData.value, realIP: setData.value.realIP, enableRealIP: true };
    if (setData.value.realIP) {
      message.success(t('settings.network.messages.realIPSuccess'));
    }
  } else {
    message.error(t('settings.network.messages.realIPError'));
    setData.value = { ...setData.value, realIP: '' };
  }
};

watch(
  () => setData.value.enableRealIP,
  (newVal) => {
    if (!newVal) {
      setData.value = { ...setData.value, realIP: '', enableRealIP: false };
    }
  }
);

// ==================== 字体设置 ====================
const systemFonts = computed(() => settingsStore.systemFonts);
const selectedFonts = ref<string[]>([]);

const renderFontLabel = (option: { label: string; value: string }) => {
  return h('span', { style: { fontFamily: option.value } }, option.label);
};

watch(
  selectedFonts,
  (newFonts) => {
    setData.value = {
      ...setData.value,
      fontFamily: newFonts.length === 0 ? 'system-ui' : newFonts.join(',')
    };
  },
  { deep: true }
);

watch(
  () => setData.value.fontFamily,
  (newFont) => {
    if (newFont) {
      selectedFonts.value = newFont === 'system-ui' ? [] : newFont.split(',');
    }
  },
  { immediate: true }
);

// ==================== 弹窗控制 ====================
const showClearCacheModal = ref(false);
const showShortcutModal = ref(false);
const showRemoteControlModal = ref(false);

const handleShortcutsChange = (shortcuts: any) => {
  console.log('快捷键已更新:', shortcuts);
};

// ==================== 缓存清理 ====================
const clearCache = async (selectedCacheTypes: string[]) => {
  const clearTasks = selectedCacheTypes.map(async (type) => {
    switch (type) {
      case 'history':
        localStorage.removeItem('musicHistory');
        break;
      case 'favorite':
        localStorage.removeItem('favoriteList');
        break;
      case 'settings':
        if (window.electron) {
          window.electron.ipcRenderer.send('set-store-value', 'set', localData);
        }
        localStorage.removeItem('appSettings');
        localStorage.removeItem('theme');
        localStorage.removeItem('lyricData');
        localStorage.removeItem('lyricFontSize');
        localStorage.removeItem('playMode');
        break;
      case 'downloads':
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-downloads-history');
        }
        break;
      case 'resources':
        if (window.electron) {
          window.electron.ipcRenderer.send('clear-audio-cache');
        }
        localStorage.removeItem('lyricCache');
        localStorage.removeItem('musicUrlCache');
        if (window.caches) {
          try {
            const cache = await window.caches.open('music-images');
            const keys = await cache.keys();
            keys.forEach((key) => cache.delete(key));
          } catch (error) {
            console.error('清除图片缓存失败:', error);
          }
        }
        break;
      case 'lyrics':
        window.api.invoke('clear-lyrics-cache');
        break;
    }
  });
  await Promise.all(clearTasks);
  message.success(t('settings.system.messages.clearSuccess'));
};

// ==================== 导航相关 ====================
interface SettingSectionConfig {
  id: string;
  electron?: boolean;
}

const settingSections: SettingSectionConfig[] = [
  { id: 'basic' },
  { id: 'playback' },
  { id: 'notion' },
  { id: 'application', electron: true },
  { id: 'network', electron: true },
  { id: 'system', electron: true },
  { id: 'about' }
];

const navSections = computed(() => {
  return settingSections
    .filter((section) => !section.electron || isElectron)
    .map((section) => ({
      id: section.id,
      title: section.id === 'notion' ? 'Notion 配置' : t(`settings.sections.${section.id}`)
    }));
});

const currentSection = ref('basic');
const scrollbarRef = ref();
const sectionRefs = reactive<Record<string, HTMLElement | null>>({
  basic: null,
  notion: null,
  playback: null,
  application: null,
  network: null,
  system: null,
  about: null,
  donation: null
});

const scrollToSection = async (sectionId: string) => {
  currentSection.value = sectionId;
  const sectionEl = sectionRefs[sectionId];
  if (sectionEl) {
    await nextTick();
    scrollbarRef.value?.scrollTo({ top: sectionEl.offsetTop - 20, behavior: 'smooth' });
  }
};

const SCROLL_OFFSET_THRESHOLD = 100;

const handleScroll = (e: any) => {
  const { scrollTop } = e.target;
  let lastValidSection = 'basic';

  for (const section of settingSections) {
    if (!section.electron || isElectron) {
      const el = sectionRefs[section.id];
      if (el && scrollTop >= el.offsetTop - SCROLL_OFFSET_THRESHOLD) {
        lastValidSection = section.id;
      }
    }
  }

  if (lastValidSection !== currentSection.value) {
    currentSection.value = lastValidSection;
  }
};

// ==================== 初始化 ====================
onMounted(async () => {
  checkForUpdates();
  if (setData.value.proxyConfig) {
    proxyForm.value = { ...setData.value.proxyConfig };
  }
  if (setData.value.enableRealIP === undefined) {
    setData.value = { ...setData.value, enableRealIP: false };
  }

  if (window.electron) {
    window.electron.ipcRenderer.on('gpu-acceleration-updated', (_, enabled: boolean) => {
      console.log('GPU加速设置已更新:', enabled);
      gpuAccelerationChanged.value = true;
    });

    window.electron.ipcRenderer.on('gpu-acceleration-update-error', (_, errorMessage: string) => {
      console.error('GPU加速设置更新错误:', errorMessage);
      gpuAccelerationChanged.value = false;
    });
  }

  await nextTick();
  handleScroll({ target: { scrollTop: 0 } });
});
</script>

<style lang="scss" scoped>
:deep(.n-select) {
  min-width: 120px;
}

:deep(.n-input-number) {
  max-width: 140px;
}
</style>
