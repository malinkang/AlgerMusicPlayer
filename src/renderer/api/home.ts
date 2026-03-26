import { IAlbumNew } from '@/types/album';
import { IRecommendMusic } from '@/types/music';
import { IPlayListSort } from '@/types/playlist';
import request from '@/utils/request';

interface IRecommendMusicParams {
  limit: number;
}

// 获取歌单分类
export const getPlaylistCategory = () => {
  return request.get<IPlayListSort>('/playlist/catlist');
};

// 获取推荐音乐
export const getRecommendMusic = (params: IRecommendMusicParams) => {
  return request.get<IRecommendMusic>('/personalized/newsong', { params });
};

// 获取最新专辑推荐
export const getNewAlbum = () => {
  return request.get<IAlbumNew>('/album/newest');
};
