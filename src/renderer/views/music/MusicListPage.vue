<template>
  <div class="music-list-page" :class="{ 'is-mobile': isMobile }">
    <div class="music-list-header p-6 flex gap-8 items-start relative overflow-hidden">
      <div
        class="header-bg"
        :style="{
          backgroundImage: `url(${getImgUrl(listInfo?.coverImgUrl || listInfo?.picUrl, '500y500')})`
        }"
      ></div>
      <div class="header-content-wrapper flex gap-8 items-start z-10 w-full">
        <div class="music-list-cover shadow-2xl rounded-2xl overflow-hidden flex-shrink-0">
          <n-image
            :src="getImgUrl(listInfo?.coverImgUrl || listInfo?.picUrl, '500y500')"
            class="w-full h-full object-cover"
            lazy
            preview-disabled
          />
        </div>
        <div class="music-list-info flex flex-col gap-4 flex-1 min-w-0">
          <div class="music-list-tag flex gap-2">
            <n-tag type="primary" size="small" round quaternary>
              {{ isAlbum ? '专辑' : '歌单' }}
            </n-tag>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white truncate">
            {{ listInfo?.name || name }}
          </h1>
          <div class="music-list-author flex items-center gap-2">
            <n-avatar
              circle
              size="small"
              :src="
                getImgUrl(
                  listInfo?.creator?.avatarUrl ||
                    listInfo?.artist?.picUrl ||
                    listInfo?.artist?.img1v1Url,
                  '100y100'
                )
              "
            />
            <span class="text-gray-600 dark:text-gray-400 font-medium">
              {{ listInfo?.creator?.nickname || listInfo?.artist?.name }}
            </span>
          </div>
          <div class="music-list-description">
            <n-ellipsis :line-clamp="2" class="text-gray-500 dark:text-gray-400 text-sm italic">
              {{ listInfo?.description || '暂无简介' }}
            </n-ellipsis>
          </div>
          <div class="music-list-actions flex gap-4 mt-2">
            <n-button type="primary" round size="large" @click="handlePlayAll">
              <template #icon>
                <i class="iconfont icon-playfill"></i>
              </template>
              播放全部
            </n-button>
            <div class="flex-1"></div>
            <div class="flex items-center gap-4">
              <n-input
                v-model:value="searchKeyword"
                placeholder="在列表中搜索..."
                round
                clearable
                class="w-64"
              >
                <template #prefix>
                  <i class="ri-search-line"></i>
                </template>
              </n-input>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="music-list-content px-6 pb-24">
      <div v-if="loading" class="flex justify-center py-20">
        <n-spin size="large" />
      </div>
      <div
        v-else-if="filteredSongs.length === 0"
        class="flex flex-col items-center py-20 opacity-50"
      >
        <i class="ri-music-2-line text-6xl mb-4"></i>
        <p>暂无音乐</p>
      </div>
      <div v-else class="song-list">
        <div
          class="song-list-header flex items-center px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b dark:border-gray-800 mb-2"
        >
          <div class="w-12 text-center">#</div>
          <div class="flex-1 ml-4">标题</div>
          <div class="w-1/4">专辑</div>
          <div class="w-20 text-right">时长</div>
        </div>
        <song-item
          v-for="(song, index) in filteredSongs"
          :key="song.id"
          :item="formatSong(song)"
          :index="index + 1"
          @click="handlePlay(song)"
        />
      </div>
    </div>
    <play-bottom />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';

import PlayBottom from '@/components/common/PlayBottom.vue';
import SongItem from '@/components/common/SongItem.vue';
import { useMusicStore, usePlayerStore } from '@/store';
import { SongResult } from '@/types/music';
import { getImgUrl, isMobile } from '@/utils';

const route = useRoute();
const playerStore = usePlayerStore();
const musicStore = useMusicStore();

const loading = ref(false);
const searchKeyword = ref('');

const isAlbum = computed(() => route.query.type === 'album');
const name = computed(() => musicStore.currentMusicListName || '');
const songList = computed(() => musicStore.currentMusicList || []);
const listInfo = computed(() => musicStore.currentListInfo);

const filteredSongs = computed(() => {
  if (!searchKeyword.value) return songList.value;
  const keyword = searchKeyword.value.toLowerCase().trim();
  return songList.value.filter(
    (song) =>
      song.name?.toLowerCase().includes(keyword) ||
      song.ar?.[0]?.name?.toLowerCase().includes(keyword) ||
      song.al?.name?.toLowerCase().includes(keyword)
  );
});

const formatSong = (song: any): SongResult => {
  return {
    ...song,
    source: 'notion',
    picUrl: song.picUrl || song.al?.picUrl || ''
  } as unknown as SongResult;
};

const handlePlay = (song: any) => {
  playerStore.setPlay(formatSong(song));
};

const handlePlayAll = () => {
  if (filteredSongs.value.length === 0) return;
  playerStore.setPlayList(filteredSongs.value.map(formatSong));
  playerStore.setPlay(formatSong(filteredSongs.value[0]));
};
</script>

<style scoped lang="scss">
.music-list-page {
  @apply h-full overflow-y-auto bg-light-100 dark:bg-dark-100;
}

.music-list-header {
  min-height: 350px;
}

.header-bg {
  @apply absolute inset-0 bg-cover bg-center;
  filter: blur(60px) brightness(0.7);
  transform: scale(1.2);
  opacity: 0.3;
}

.music-list-cover {
  @apply w-64 h-64 shadow-black/20;
}

.music-list-tag {
  @apply mb-1;
}

.is-mobile {
  .header-content-wrapper {
    @apply flex-col items-center text-center;
  }
  .music-list-cover {
    @apply w-48 h-48;
  }
}
</style>
