# 修复歌曲列表封面图片不显示

## 变更摘要

歌曲列表中每首歌的小封面显示为黑色圆圈，但左侧大封面正常。

### 原因

歌曲列表的 `n-image` 组件设置了 `crossorigin: 'anonymous'`，浏览器会要求 S3 返回 CORS 头。
Notion S3 签名 URL 不返回 CORS 头，导致图片被浏览器阻止加载。
左侧大封面没有设置 `crossorigin`，所以不受影响。

### 修复

移除所有歌曲列表项组件中的 `crossorigin: 'anonymous'` 属性。

## 修改文件

- `src/renderer/components/common/songItemCom/ListSongItem.vue`
- `src/renderer/components/common/songItemCom/MiniSongItem.vue`
- `src/renderer/components/common/songItemCom/StandardSongItem.vue`
- `src/renderer/components/common/songItemCom/SongItemDropdown.vue`
