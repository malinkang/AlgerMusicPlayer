# 修复封面图片和歌词显示

## 变更摘要

修复了从 Notion 数据源播放 Apple Music 歌曲时，封面图片和歌词无法显示的问题。

### 封面图片

- `getImgUrl()` 会给所有 URL 追加 `?param=300y300`，这会破坏 Notion S3 签名 URL
- 添加了对 S3/Notion URL 的识别，直接返回原始 URL

### 歌词

- `loadLrc()` 中 `parseInt(id, 10)` 将 Apple Music 字符串 ID（如 `i.4YBN1Vzf4Wp0GW`）转为 `NaN`
- 移除了不必要的 parseInt，直接传递原始 ID

### 服务端 URL 过期处理

- 音频 URL：简化为始终从 Notion 重新获取新的签名 URL
- 歌词 URL：当缓存 URL 过期时，自动从 Notion 重新获取

## 修改文件

- `src/renderer/utils/index.ts` — Notion S3 URL 直接返回
- `src/renderer/hooks/usePlayerHooks.ts` — 移除 parseInt 转换
- `server/index.mjs` — 音频/歌词 URL 过期重新获取逻辑
