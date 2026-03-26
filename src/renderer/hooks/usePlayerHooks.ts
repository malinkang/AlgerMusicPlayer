import { getMusicLrc, getMusicUrl } from '@/api/music';
import { playbackRequestManager } from '@/services/playbackRequestManager';
import type { ILyric, ILyricText, IWordData, SongResult } from '@/types/music';
import { getImgUrl } from '@/utils';
import { getImageLinearBackground } from '@/utils/linearColor';
import { parseLyrics as parseYrcLyrics } from '@/utils/yrcParser';

/**
 * 获取歌曲播放URL（独立函数）
 */
export const getSongUrl = async (
  id: string | number,
  songData: SongResult,
  _isDownloaded: boolean = false,
  requestId?: string
) => {
  try {
    // 在开始处理前验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongUrl] 请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (songData.playMusicUrl) {
      return songData.playMusicUrl;
    }

    // 直接从服务器获取音频URL
    const { data } = await getMusicUrl(id);

    // 验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongUrl] 获取URL后请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (data && data.data && data.data[0]) {
      const songDetail = data.data[0];
      if (songDetail.url) {
        console.log('获取音频URL成功');
        return songDetail.url;
      }
    }

    console.warn('未找到音频URL');
    return null;
  } catch (error) {
    if ((error as Error).message === 'Request cancelled') {
      throw error;
    }
    console.error('获取音频URL失败:', error);
    return null;
  }
};

/**
 * useSongUrl hook（兼容旧代码）
 */
export const useSongUrl = () => {
  return { getSongUrl };
};

/**
 * 使用新的yrcParser解析歌词（独立函数）
 */
const parseLyrics = (lyricsString: string): { lyrics: ILyricText[]; times: number[] } => {
  if (!lyricsString || typeof lyricsString !== 'string') {
    return { lyrics: [], times: [] };
  }

  try {
    const parseResult = parseYrcLyrics(lyricsString);

    if (!parseResult.success) {
      console.error('歌词解析失败:', parseResult.error.message);
      return { lyrics: [], times: [] };
    }

    const { lyrics: parsedLyrics } = parseResult.data;
    const lyrics: ILyricText[] = [];
    const times: number[] = [];

    for (const line of parsedLyrics) {
      // 检查是否有逐字歌词
      const hasWords = line.words && line.words.length > 0;

      lyrics.push({
        text: line.fullText,
        trText: '', // 翻译文本稍后处理
        words: hasWords ? (line.words as IWordData[]) : undefined,
        hasWordByWord: hasWords,
        startTime: line.startTime,
        duration: line.duration
      });

      // 时间数组使用秒为单位（与原有逻辑保持一致）
      times.push(line.startTime / 1000);
    }

    return { lyrics, times };
  } catch (error) {
    console.error('解析歌词时发生错误:', error);
    return { lyrics: [], times: [] };
  }
};

/**
 * 加载歌词（独立函数）
 */
export const loadLrc = async (id: string | number): Promise<ILyric> => {
  if (typeof id === 'string' && id.includes('--')) {
    console.log('B站音频，无需加载歌词');
    return {
      lrcTimeArray: [],
      lrcArray: [],
      hasWordByWord: false
    };
  }

  try {
    const { data } = await getMusicLrc(id);
    const { lyrics, times } = parseLyrics(data?.yrc?.lyric || data?.lrc?.lyric);

    // 检查是否有逐字歌词
    let hasWordByWord = false;
    for (const lyric of lyrics) {
      if (lyric.hasWordByWord) {
        hasWordByWord = true;
        break;
      }
    }

    if (data.tlyric && data.tlyric.lyric) {
      const { lyrics: tLyrics } = parseLyrics(data.tlyric.lyric);

      // 按索引顺序一一对应翻译歌词
      if (tLyrics.length === lyrics.length) {
        // 数量相同，直接按索引对应
        lyrics.forEach((item, index) => {
          item.trText = item.text && tLyrics[index] ? tLyrics[index].text : '';
        });
      } else {
        // 数量不同，构建时间戳映射并尝试匹配
        const tLyricMap = new Map<number, string>();
        tLyrics.forEach((lyric) => {
          if (lyric.text && lyric.startTime !== undefined) {
            const timeInSeconds = lyric.startTime / 1000;
            tLyricMap.set(timeInSeconds, lyric.text);
          }
        });

        // 为每句歌词查找最接近的翻译
        lyrics.forEach((item, index) => {
          if (!item.text) {
            item.trText = '';
            return;
          }

          const currentTime = times[index];
          let closestTime = -1;
          let minDiff = 2.0; // 最大允许差异2秒

          // 查找最接近的时间戳
          for (const [tTime] of tLyricMap.entries()) {
            const diff = Math.abs(tTime - currentTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestTime = tTime;
            }
          }

          item.trText = closestTime !== -1 ? tLyricMap.get(closestTime) || '' : '';
        });
      }
    } else {
      // 没有翻译歌词，清空 trText
      lyrics.forEach((item) => {
        item.trText = '';
      });
    }

    return {
      lrcTimeArray: times,
      lrcArray: lyrics,
      hasWordByWord
    };
  } catch (err) {
    console.error('Error loading lyrics:', err);
    return {
      lrcTimeArray: [],
      lrcArray: [],
      hasWordByWord: false
    };
  }
};

/**
 * useLyrics hook（兼容旧代码）
 */
export const useLyrics = () => {
  return { loadLrc, parseLyrics };
};

/**
 * 获取歌曲详情
 */
export const useSongDetail = () => {
  const { getSongUrl } = useSongUrl();

  const getSongDetail = async (playMusic: SongResult, requestId?: string) => {
    // 验证请求
    if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
      console.log(`[getSongDetail] 请求已失效: ${requestId}`);
      throw new Error('Request cancelled');
    }

    if (playMusic.expiredAt && playMusic.expiredAt < Date.now()) {
      console.info(`歌曲已过期，重新获取: ${playMusic.name}`);
      playMusic.playMusicUrl = undefined;
    }

    try {
      const playMusicUrl =
        playMusic.playMusicUrl || (await getSongUrl(playMusic.id, playMusic, false, requestId));

      // 验证请求
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[getSongDetail] URL获取后请求已失效: ${requestId}`);
        throw new Error('Request cancelled');
      }

      playMusic.createdAt = Date.now();
      // 半小时后过期
      playMusic.expiredAt = playMusic.createdAt + 1800000;
      const { backgroundColor, primaryColor } =
        playMusic.backgroundColor && playMusic.primaryColor
          ? playMusic
          : await getImageLinearBackground(getImgUrl(playMusic?.picUrl, '30y30'));

      // 验证请求
      if (requestId && !playbackRequestManager.isRequestValid(requestId)) {
        console.log(`[getSongDetail] 背景色获取后请求已失效: ${requestId}`);
        throw new Error('Request cancelled');
      }

      playMusic.playLoading = false;
      return { ...playMusic, playMusicUrl, backgroundColor, primaryColor } as SongResult;
    } catch (error) {
      if ((error as Error).message === 'Request cancelled') {
        throw error;
      }
      console.error('获取音频URL失败:', error);
      playMusic.playLoading = false;
      throw error;
    }
  };

  return { getSongDetail };
};
