# music_page

一个实时读取 Notion 的音乐主页：
- Node 服务端持有 `NOTION_TOKEN`，前端通过 `/api/music/library` 请求数据
- 服务端读取 Notion 的歌曲/歌手/专辑/歌单数据库并返回分页结果
- 前端展示播放器、歌词、分页歌曲列表、歌手、专辑、歌单
- 如果 Notion 歌曲页里有音频文件或音频 URL，就支持站内播放

## 环境变量

运行时至少需要：

- `NOTION_TOKEN`
- `SONG_DATABASE_ID`

可选：

- `SINGER_DATABASE_ID`
- `ALBUM_DATABASE_ID`
- `PLAYLIST_DATABASE_ID`
- `NOTION_PAGE`
  如果不想手动写数据库 ID，可以提供一个包含这些数据库的 Notion 页面，服务端会尝试自动发现名为 `歌曲` / `歌手` / `专辑` / `歌单` 的子数据库。

## 命令

```bash
npm install
npm run develop
```

## 当前实现

- `server.mjs` 在开发态把 Vite 和 `/api` 合在同一个 Node 进程里运行
- `/api/music/library` 会实时从 Notion 拉取数据，并在服务端做搜索过滤和分页
- `封面` / `音频` / `歌词` 如果在 Notion 中存在，会直接进入前端展示
- 页面会优先播放 Notion 中的音频字段，否则保留网易云外链
