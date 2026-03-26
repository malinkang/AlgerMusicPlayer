import { useThrottleFn } from '@vueuse/core';
import { createDiscreteApi } from 'naive-ui';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import i18n from '@/../i18n/renderer';
import { useSongDetail } from '@/hooks/usePlayerHooks';
import { preloadService } from '@/services/preloadService';
import type { SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { performShuffle, preloadCoverImage } from '@/utils/playerUtils';

import { usePlayerCoreStore } from './playerCore';
import { useSleepTimerStore } from './sleepTimer';

const { message } = createDiscreteApi(['message']);

/**
 * 播放列表管理 Store
 * 负责：播放列表、索引、播放模式、预加载、上/下一首
 */
export const usePlaylistStore = defineStore(
  'playlist',
  () => {
    // ==================== 状态 ====================
    const playList = shallowRef<SongResult[]>([]);
    const playListIndex = ref(0);
    const playMode = ref(0);
    const originalPlayList = shallowRef<SongResult[]>([]);
    const playListDrawerVisible = ref(false);

    // 连续失败计数器
    const consecutiveFailCount = ref(0);
    const MAX_CONSECUTIVE_FAILS = 5;
    const SINGLE_TRACK_MAX_RETRIES = 3;

    // ==================== Computed ====================
    const currentPlayList = computed(() => playList.value);
    const currentPlayListIndex = computed(() => playListIndex.value);

    // ==================== Actions ====================

    /**
     * 获取歌曲详情并预加载
     */
    const fetchSongs = async (startIndex: number, endIndex: number) => {
      try {
        const songs = playList.value.slice(
          Math.max(0, startIndex),
          Math.min(endIndex, playList.value.length)
        );
        const { getSongDetail } = useSongDetail();

        const detailedSongs = await Promise.all(
          songs.map(async (song: SongResult) => {
            try {
              if (!song.playMusicUrl || (song.source === 'netease' && !song.backgroundColor)) {
                return await getSongDetail(song);
              }
              return song;
            } catch (error) {
              console.error('获取歌曲详情失败:', error);
              return song;
            }
          })
        );

        const nextSong = detailedSongs[0];
        if (nextSong && !(nextSong.lyric && nextSong.lyric.lrcTimeArray.length > 0)) {
          try {
            const { useLyrics } = await import('@/hooks/usePlayerHooks');
            const { loadLrc } = useLyrics();
            nextSong.lyric = await loadLrc(nextSong.id);
          } catch (error) {
            console.error('加载歌词失败:', error);
          }
        }

        detailedSongs.forEach((song, index) => {
          if (song && startIndex + index < playList.value.length) {
            playList.value[startIndex + index] = song;
          }
        });

        if (nextSong) {
          if (nextSong.playMusicUrl) {
            preloadService.load(nextSong);
          }
          if (nextSong.picUrl) {
            preloadCoverImage(nextSong.picUrl, getImgUrl);
          }
        }
      } catch (error) {
        console.error('获取歌曲列表失败:', error);
      }
    };

    /**
     * 智能预加载下一首歌曲
     */
    const preloadNextSongs = (currentIndex: number) => {
      if (playList.value.length <= 1) return;

      let nextIndex: number;

      if (playMode.value === 0) {
        if (currentIndex >= playList.value.length - 1) {
          return;
        }
        nextIndex = currentIndex + 1;
      } else {
        nextIndex = (currentIndex + 1) % playList.value.length;
      }

      const endIndex = Math.min(nextIndex + 2, playList.value.length);

      if (nextIndex < playList.value.length) {
        fetchSongs(nextIndex, endIndex);

        if (
          (playMode.value === 1 || playMode.value === 2) &&
          nextIndex + 1 >= playList.value.length &&
          playList.value.length > 2
        ) {
          setTimeout(() => {
            fetchSongs(0, 1);
          }, 1000);
        }
      }
    };

    /**
     * 应用随机播放
     */
    const shufflePlayList = () => {
      if (playList.value.length === 0) return;

      if (originalPlayList.value.length === 0) {
        originalPlayList.value = [...playList.value];
      }

      const currentSong = playList.value[playListIndex.value];
      const shuffled = performShuffle([...playList.value], currentSong);
      playList.value = [...shuffled];
      playListIndex.value = 0;
    };

    /**
     * 恢复原始播放列表顺序
     */
    const restoreOriginalOrder = () => {
      if (originalPlayList.value.length === 0) return;

      const currentSong = playList.value[playListIndex.value];
      playList.value = [...originalPlayList.value];
      originalPlayList.value = [];

      if (currentSong) {
        const index = playList.value.findIndex((s) => s.id === currentSong.id);
        if (index !== -1) {
          playListIndex.value = index;
        }
      }
    };

    /**
     * 设置播放列表
     */
    const setPlayList = (list: SongResult[], keepIndex: boolean = false) => {
      if (list.length === 0) {
        playList.value = [];
        playListIndex.value = 0;
        originalPlayList.value = [];
        return;
      }

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      if (playMode.value === 2) {
        originalPlayList.value = [...list];
        const currentSong = playMusic.value;
        const shuffledList = performShuffle(list, currentSong);

        if (currentSong && currentSong.id) {
          const currentSongIndex = shuffledList.findIndex((song) => song.id === currentSong.id);
          playListIndex.value =
            currentSongIndex !== -1 ? 0 : keepIndex ? Math.max(0, playListIndex.value) : 0;
        } else {
          playListIndex.value = keepIndex ? Math.max(0, playListIndex.value) : 0;
        }

        playList.value = shuffledList;
      } else {
        if (originalPlayList.value.length > 0) {
          originalPlayList.value = [];
        }

        if (!keepIndex) {
          const foundIndex = list.findIndex((item) => item.id === playMusic.value.id);
          playListIndex.value = foundIndex !== -1 ? foundIndex : 0;
        }

        playList.value = list;
      }
    };

    /**
     * 添加到下一首播放
     */
    const addToNextPlay = (song: SongResult) => {
      const list = [...playList.value];
      const currentIndex = playListIndex.value;

      const existingIndex = list.findIndex((item) => item.id === song.id);
      if (existingIndex !== -1) {
        list.splice(existingIndex, 1);
        if (existingIndex <= currentIndex) {
          playListIndex.value = Math.max(0, playListIndex.value - 1);
        }
      }

      const insertIndex = playListIndex.value + 1;
      list.splice(insertIndex, 0, song);

      setPlayList(list, true);
    };

    /**
     * 从播放列表移除歌曲
     */
    const removeFromPlayList = (id: number | string) => {
      const index = playList.value.findIndex((item) => item.id === id);
      if (index === -1) return;

      const playerCore = usePlayerCoreStore();
      const { playMusic } = storeToRefs(playerCore);

      if (id === playMusic.value.id) {
        nextPlay();
      }

      const newPlayList = [...playList.value];
      newPlayList.splice(index, 1);
      setPlayList(newPlayList);
    };

    /**
     * 清空播放列表
     */
    const clearPlayAll = async () => {
      const { audioService } = await import('@/services/audioService');
      const playerCore = usePlayerCoreStore();

      audioService.pause();
      setTimeout(() => {
        playerCore.playMusic = {} as SongResult;
        playerCore.playMusicUrl = '';
        playList.value = [];
        playListIndex.value = 0;
        originalPlayList.value = [];
        localStorage.removeItem('currentPlayMusic');
        localStorage.removeItem('currentPlayMusicUrl');
      }, 500);
    };

    /**
     * 切换播放模式
     */
    const togglePlayMode = async () => {
      const wasRandom = playMode.value === 2;
      const newMode = (playMode.value + 1) % 3; // 移除心动模式 (3)

      const isRandom = newMode === 2;

      playMode.value = newMode;

      if (isRandom && !wasRandom && playList.value.length > 0) {
        shufflePlayList();
      }

      if (!isRandom && wasRandom) {
        restoreOriginalOrder();
      }
    };

    /**
     * 下一首
     */
    const _nextPlay = async (singleTrackRetryCount: number = 0) => {
      try {
        if (playList.value.length === 0) {
          return;
        }

        const playerCore = usePlayerCoreStore();
        const sleepTimerStore = useSleepTimerStore();

        if (consecutiveFailCount.value >= MAX_CONSECUTIVE_FAILS) {
          message.warning(i18n.global.t('player.consecutiveFailsError'));
          consecutiveFailCount.value = 0;
          playerCore.setIsPlay(false);
          return;
        }

        if (
          playMode.value === 0 &&
          playListIndex.value === playList.value.length - 1 &&
          sleepTimerStore.sleepTimer.type === 'end'
        ) {
          sleepTimerStore.stopPlayback();
          return;
        }

        const nowPlayListIndex = (playListIndex.value + 1) % playList.value.length;
        const nextSong = { ...playList.value[nowPlayListIndex] };

        const success = await playerCore.handlePlayMusic(nextSong, true);

        if (success) {
          consecutiveFailCount.value = 0;
          playListIndex.value = nowPlayListIndex;
          sleepTimerStore.handleSongChange();
        } else {
          if (singleTrackRetryCount < SINGLE_TRACK_MAX_RETRIES) {
            setTimeout(() => {
              _nextPlay(singleTrackRetryCount + 1);
            }, 1000);
          } else {
            consecutiveFailCount.value++;
            if (playList.value.length > 1) {
              playListIndex.value = nowPlayListIndex;
              message.warning(i18n.global.t('player.parseFailedPlayNext'));
              setTimeout(() => {
                _nextPlay(0);
              }, 500);
            } else {
              message.error(i18n.global.t('player.playFailed'));
              playerCore.setIsPlay(false);
            }
          }
        }
      } catch (error) {
        console.error('切换下一首出错:', error);
      }
    };

    const nextPlay = useThrottleFn(_nextPlay, 500);

    /**
     * 上一首
     */
    const _prevPlay = async () => {
      try {
        if (playList.value.length === 0) {
          return;
        }

        const playerCore = usePlayerCoreStore();
        const nowPlayListIndex =
          (playListIndex.value - 1 + playList.value.length) % playList.value.length;

        const prevSong = { ...playList.value[nowPlayListIndex] };

        let success = false;
        let retryCount = 0;
        const maxRetries = 2;

        while (!success && retryCount < maxRetries) {
          success = await playerCore.handlePlayMusic(prevSong);

          if (!success) {
            retryCount++;
            if (retryCount >= maxRetries) {
              const newPlayList = [...playList.value];
              newPlayList.splice(nowPlayListIndex, 1);

              if (newPlayList.length > 0) {
                setPlayList(newPlayList, true);
                if (newPlayList.length === 1) {
                  playListIndex.value = 0;
                } else {
                  playListIndex.value =
                    (playListIndex.value - 1 + newPlayList.length) % newPlayList.length;
                }
                setTimeout(() => {
                  prevPlay();
                }, 300);
                return;
              }
              break;
            }
          }
        }

        if (success) {
          playListIndex.value = nowPlayListIndex;
        } else {
          playerCore.setIsPlay(false);
          message.error(i18n.global.t('player.playFailed'));
        }
      } catch (error) {
        console.error('切换上一首出错:', error);
      }
    };

    const prevPlay = useThrottleFn(_prevPlay, 500);

    /**
     * 设置播放列表抽屉显示状态
     */
    const setPlayListDrawerVisible = (value: boolean) => {
      playListDrawerVisible.value = value;
    };

    /**
     * 设置播放
     */
    const setPlay = async (song: SongResult) => {
      try {
        const playerCore = usePlayerCoreStore();

        if (song.expiredAt && song.expiredAt < Date.now()) {
          song.playMusicUrl = undefined;
          song.expiredAt = undefined;
        }

        if (
          playerCore.playMusic.id === song.id &&
          playerCore.playMusic.playMusicUrl === song.playMusicUrl &&
          !song.isFirstPlay
        ) {
          if (playerCore.play) {
            playerCore.setPlayMusic(false);
            const { audioService } = await import('@/services/audioService');
            audioService.getCurrentSound()?.pause();
            playerCore.userPlayIntent = false;
          } else {
            playerCore.setPlayMusic(true);
            playerCore.userPlayIntent = true;
            const { audioService } = await import('@/services/audioService');
            const sound = audioService.getCurrentSound();
            if (sound) {
              sound.play();
              playerCore.checkPlaybackState(playerCore.playMusic);
            }
          }
          return;
        }

        if (song.isFirstPlay) {
          song.isFirstPlay = false;
        }

        const songIndex = playList.value.findIndex(
          (item: SongResult) => item.id === song.id && item.source === song.source
        );

        if (songIndex !== -1 && songIndex !== playListIndex.value) {
          playListIndex.value = songIndex;
        }

        const success = await playerCore.handlePlayMusic(song);

        if (success) {
          playerCore.isPlay = true;
          if (songIndex !== -1) {
            setTimeout(() => {
              preloadNextSongs(playListIndex.value);
            }, 3000);
          }
        }
        return success;
      } catch (error) {
        console.error('设置播放失败:', error);
        return false;
      }
    };

    const initializePlaylist = async () => {
      if (playMode.value === 2 && playList.value.length > 0) {
        if (originalPlayList.value.length === 0) {
          shufflePlayList();
        }
      }
    };

    return {
      playList,
      playListIndex,
      playMode,
      originalPlayList,
      playListDrawerVisible,
      currentPlayList,
      currentPlayListIndex,
      setPlayList,
      addToNextPlay,
      removeFromPlayList,
      clearPlayAll,
      togglePlayMode,
      shufflePlayList,
      restoreOriginalOrder,
      preloadNextSongs,
      nextPlay: nextPlay as unknown as typeof _nextPlay,
      prevPlay: prevPlay as unknown as typeof _prevPlay,
      setPlayListDrawerVisible,
      setPlay,
      initializePlaylist,
      fetchSongs,
      updateSong: (song: SongResult) => {
        const index = playList.value.findIndex(
          (item) => item.id === song.id && item.source === song.source
        );
        if (index !== -1) {
          playList.value[index] = song;
          playList.value = [...playList.value];
        }
      }
    };
  },
  {
    persist: {
      key: 'playlist-store',
      storage: localStorage,
      pick: ['playList', 'playListIndex', 'playMode', 'originalPlayList']
    }
  }
);
