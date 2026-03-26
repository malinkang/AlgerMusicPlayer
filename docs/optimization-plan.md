# Music Page 优化方案

## 一、死代码清理（优先级：高）

项目从完整的网易云音乐播放器精简为 Notion 专辑播放器，目前只使用了 2 个主路由（歌单列表 + 设置），但约 90% 的原始代码仍未清理。

### 1.1 可删除的 API 模块

| 文件                        | 说明                                     |
| --------------------------- | ---------------------------------------- |
| `api/artist.ts`             | 歌手详情/专辑/热门歌曲                   |
| `api/user.ts`               | 用户资料、关注列表、收藏专辑等 12 个函数 |
| `api/search.ts`             | 搜索功能（含 B 站回退）                  |
| `api/bilibili.ts`           | B 站视频/音频获取（445 行）              |
| `api/mv.ts`                 | MV 播放接口                              |
| `api/donation.ts`           | 捐赠列表（调用外部 API）                 |
| `api/gdmusic.ts`            | GD Music 回退解析                        |
| `api/parseFromCustomApi.ts` | 自定义插件 API 解析                      |

### 1.2 可删除的视图

| 文件                                 | 说明               |
| ------------------------------------ | ------------------ |
| `views/artist/detail.vue`            | 歌手详情页         |
| `views/bilibili/BilibiliPlayer.vue`  | B 站播放器         |
| `views/download/DownloadPage.vue`    | 下载管理           |
| `views/favorite/index.vue`           | 收藏歌曲           |
| `views/history/index.vue`            | 播放历史           |
| `views/historyAndFavorite/index.vue` | 历史+收藏          |
| `views/home/index.vue`               | 首页推荐           |
| `views/heatmap/index.vue`            | 活跃热力图         |
| `views/login/index.vue`              | 网易云登录         |
| `views/mv/index.vue`                 | MV 列表            |
| `views/playlist/ImportPlaylist.vue`  | 导入歌单           |
| `views/search/index.vue`             | 搜索               |
| `views/toplist/index.vue`            | 排行榜             |
| `views/user/`                        | 用户资料/关注/粉丝 |
| `views/mobile-search/`               | 移动端搜索         |

### 1.3 可删除的组件

| 文件                                            | 说明         |
| ----------------------------------------------- | ------------ |
| `components/ArtistDrawer.vue`                   | 歌手侧边栏   |
| `components/DonationList.vue`                   | 捐赠列表弹窗 |
| `components/DownloadDrawer.vue`                 | 下载管理器   |
| `components/MvPlayer.vue`                       | MV 播放组件  |
| 登录组件 (`CookieLogin`, `QrLogin`, `UidLogin`) | 网易云登录   |

### 1.4 可删除的 Store / Hook / 类型

| 文件                                                                                               | 说明             |
| -------------------------------------------------------------------------------------------------- | ---------------- |
| `store/modules/recommend.ts`                                                                       | 推荐数据         |
| `store/modules/favorite.ts`                                                                        | 收藏歌曲         |
| `store/modules/search.ts`                                                                          | 搜索结果         |
| `hooks/AlbumHistoryHook.ts`                                                                        | 专辑浏览历史     |
| `hooks/MusicHistoryHook.ts`                                                                        | 播放历史         |
| `hooks/PlaylistHistoryHook.ts`                                                                     | 歌单浏览历史     |
| `types/artist.ts`, `bilibili.ts`, `mv.ts`, `user.ts`, `search.ts`, `singer.ts`, `day_recommend.ts` | 未使用的类型定义 |

### 1.5 可删除的 i18n 翻译

以下模块的翻译文件（4 种语言 × 10 个模块 = 40+ 文件）可删除：
`artist`, `bilibili`, `donation`, `download`, `favorite`, `history`, `login`, `search`, `user`, `mv`

### 1.6 可删除的服务/工具

| 文件                                          | 说明                                             |
| --------------------------------------------- | ------------------------------------------------ |
| `api/musicParser.ts`                          | 音乐源回退策略（GD Music、自定义 API）—— 700+ 行 |
| `services/LxMusicSourceRunner.ts`             | LxMusic 音源                                     |
| `services/SongSourceConfigManager.ts`         | 多音源配置管理                                   |
| `components/settings/MusicSourceSettings.vue` | 音源设置 UI                                      |
| `utils/request_music.ts`                      | 未使用的音乐 API 客户端                          |

**预计清理量：50+ 文件，5000+ 行代码**

---

## 二、服务端优化（优先级：高）

### 2.1 缓存 TTL 过短

**现状**：缓存 TTL = 5 分钟，导致频繁重新查询 Notion API。
**建议**：对于歌曲元数据（歌名、歌手、专辑），TTL 改为 30-60 分钟。Notion 数据库内容变化频率低，不需要频繁刷新。

### 2.2 关联解析太慢

**现状**：每首歌单独调用 `getPage()` 解析歌手和专辑关联，N 首歌 = 2N 次 API 调用。
**建议**：

- 收集所有关联 ID，去重后批量解析
- 缓存已解析的关联页面，避免重复查询同一歌手/专辑

### 2.3 音频 URL 每次都重新获取

**现状**：`/song/url/v1` 每次都调用 `getPage()` 获取新的签名 URL。
**建议**：缓存音频 URL 并记录获取时间，仅在接近过期时（如 50 分钟后）才重新获取，而非每次都查。

### 2.4 属性名硬编码

**现状**：`歌词`, `音频`, `歌手`, `专辑` 等字段名硬编码为中文。
**建议**：在配置中添加属性名映射，允许用户使用不同命名的数据库。

---

## 三、前端优化（优先级：中）

### 3.1 Setup 页面体验

**现状**：配置后立即跳转，后台静默加载数据，用户看到空歌单。
**建议**：

- 跳转后显示加载进度提示
- 或在 Setup 页面等待首次数据加载完成再跳转

### 3.2 清理 request.ts

**现状**：`request.ts` 中仍有网易云 token 处理逻辑（`localStorage.getItem('token')`）。
**建议**：移除网易云相关的请求拦截器逻辑，只保留 Notion 所需的配置。

### 3.3 错误提示不友好

**现状**：歌曲无法播放时静默跳过，用户不知道原因。
**建议**：

- 无音频文件的歌曲显示灰色/禁用状态
- 播放失败时显示 toast 提示

---

## 四、安全优化（优先级：中）

### 4.1 Token 存储

**现状**：Notion token 明文存储在 localStorage。
**建议**：

- 在设置页面显示时遮罩 token
- 考虑使用 sessionStorage 或内存存储（重启需重新输入）

### 4.2 配置验证

**现状**：服务端收到无效 config 时返回空数据，前端无法区分「未配置」和「空数据库」。
**建议**：无效配置返回明确的错误码（如 401），前端据此引导用户重新配置。

---

## 五、部署优化（优先级：低）

### 5.1 端口配置

**现状**：端口 30488 硬编码在多处。
**建议**：统一通过环境变量配置。

### 5.2 Vercel 部署

**现状**：Express 服务端无法直接部署到 Vercel。
**建议**：

- 将 `server/index.mjs` 拆分为 Vercel Serverless Functions
- 使用 Vercel KV 或 Redis 替代内存缓存
- 配置通过环境变量传入而非 POST 接口

---

## 优化优先级排序

| 优先级 | 任务                        | 预计收益                   |
| ------ | --------------------------- | -------------------------- |
| P0     | 清理死代码（50+ 文件）      | 减小包体积，降低维护复杂度 |
| P0     | 批量解析关联 + 增大缓存 TTL | 大幅提升加载速度           |
| P1     | 音频 URL 缓存优化           | 减少播放延迟               |
| P1     | Setup 页面加载体验          | 改善首次使用体验           |
| P1     | 播放失败错误提示            | 改善用户体验               |
| P2     | 清理 request.ts / i18n      | 代码整洁                   |
| P2     | Token 安全                  | 安全性                     |
| P3     | Vercel 部署支持             | 可选，按需实施             |
