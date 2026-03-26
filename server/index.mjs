/**
 * Notion → Netease-compatible API proxy server.
 *
 * Reads Apple Music songs from a Notion database and serves them
 * in the format that AlgerMusicPlayer expects.
 *
 * Usage:
 *   node server/index.mjs
 *
 * The frontend POSTs config (notionToken, databaseId) to /api/config,
 * then the server uses Notion API to serve playlist/song data.
 */

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---------- In-memory config & cache ----------

let config = { notionToken: '', databaseId: '' };
let songsCache = [];        // Flat list of all songs
let albumsCache = [];       // Grouped by album
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

// ---------- Notion helpers ----------

async function notionFetch(url, method = 'POST', body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${config.notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API ${res.status}: ${text}`);
  }
  return res.json();
}

/** Query all pages from a Notion database (handles pagination). */
async function queryAll(databaseId) {
  const pages = [];
  let cursor = undefined;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      'POST',
      body
    );
    pages.push(...data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return pages;
}

/** Get a single page by ID (to resolve relations). */
async function getPage(pageId) {
  return notionFetch(
    `https://api.notion.com/v1/pages/${pageId}`,
    'GET'
  );
}

// ---------- Property extractors ----------

function getPropValue(prop) {
  if (!prop) return null;
  switch (prop.type) {
    case 'title':
      return prop.title?.map(t => t.plain_text).join('') || '';
    case 'rich_text':
      return prop.rich_text?.map(t => t.plain_text).join('') || '';
    case 'url':
      return prop.url || '';
    case 'date':
      return prop.date?.start || '';
    case 'files':
      if (!prop.files?.length) return null;
      const f = prop.files[0];
      if (f.type === 'file') return f.file?.url;
      if (f.type === 'external') return f.external?.url;
      if (f.type === 'file_upload') return f.file_upload?.url;
      return null;
    case 'relation':
      return prop.relation?.map(r => r.id) || [];
    case 'number':
      return prop.number;
    default:
      return null;
  }
}

function getPageIcon(page) {
  const icon = page.icon;
  if (!icon) return '';
  if (icon.type === 'external') return icon.external?.url || '';
  if (icon.type === 'file') return icon.file?.url || '';
  if (icon.type === 'file_upload') return icon.file_upload?.url || '';
  return '';
}

function getPageCover(page) {
  const cover = page.cover;
  if (!cover) return '';
  if (cover.type === 'external') return cover.external?.url || '';
  if (cover.type === 'file') return cover.file?.url || '';
  if (cover.type === 'file_upload') return cover.file_upload?.url || '';
  return '';
}

// ---------- Data loading ----------

/** Load all songs from Notion and build cache. */
async function loadSongs() {
  if (Date.now() - cacheTimestamp < CACHE_TTL && songsCache.length > 0) {
    return;
  }

  console.log('Loading songs from Notion...');
  const pages = await queryAll(config.databaseId);
  console.log(`Fetched ${pages.length} songs from Notion.`);

  // Resolve album/artist relations
  const relationCache = {};

  async function resolveRelation(ids) {
    const results = [];
    for (const id of ids) {
      if (relationCache[id]) {
        results.push(relationCache[id]);
        continue;
      }
      try {
        const page = await getPage(id);
        const props = page.properties;
        // Find title property
        let name = '';
        for (const key of Object.keys(props)) {
          if (props[key].type === 'title') {
            name = getPropValue(props[key]);
            break;
          }
        }
        const info = {
          id,
          name,
          picUrl: getPageIcon(page) || getPageCover(page) || '',
        };
        relationCache[id] = info;
        results.push(info);
      } catch (e) {
        console.error(`Failed to resolve relation ${id}:`, e.message);
        results.push({ id, name: 'Unknown', picUrl: '' });
      }
    }
    return results;
  }

  const songs = [];
  for (const page of pages) {
    const props = page.properties;

    // Find the title field (could be "歌曲" or any title-type prop)
    let songName = '';
    let titleKey = '';
    for (const key of Object.keys(props)) {
      if (props[key].type === 'title') {
        songName = getPropValue(props[key]);
        titleKey = key;
        break;
      }
    }

    const trackId = getPropValue(props['Id']) || page.id;
    const songUrl = getPropValue(props['链接']) || '';
    const audioUrl = getPropValue(props['音频']) || '';
    const lyricsUrl = getPropValue(props['歌词']) || '';
    const dateAdded = getPropValue(props['日期']) || '';

    // Resolve artists
    const artistIds = getPropValue(props['歌手']) || [];
    const artists = artistIds.length > 0 ? await resolveRelation(artistIds) : [];

    // Resolve album
    const albumIds = getPropValue(props['专辑']) || [];
    const albums = albumIds.length > 0 ? await resolveRelation(albumIds) : [];
    const album = albums[0] || { id: 'unknown', name: 'Unknown Album', picUrl: '' };

    const coverUrl = getPageIcon(page) || getPageCover(page) || album.picUrl || '';

    songs.push({
      notionPageId: page.id,
      id: trackId,
      name: songName,
      artists,
      album,
      picUrl: coverUrl,
      audioUrl,
      lyricsUrl,
      songUrl,
      dateAdded,
    });
  }

  songsCache = songs;

  // Group by album
  const albumMap = new Map();
  for (const song of songs) {
    const albumId = song.album.id;
    if (!albumMap.has(albumId)) {
      albumMap.set(albumId, {
        id: albumId,
        name: song.album.name,
        picUrl: song.album.picUrl || song.picUrl,
        songs: [],
      });
    }
    albumMap.get(albumId).songs.push(song);
  }
  albumsCache = Array.from(albumMap.values());

  cacheTimestamp = Date.now();
  console.log(`Cached ${songs.length} songs in ${albumsCache.length} albums.`);
}

// ---------- Transform helpers (Notion → Netease format) ----------

function toNeteaseSong(song, index = 0) {
  return {
    name: song.name,
    id: song.id,
    ar: song.artists.map((a, i) => ({
      id: i + 1,
      name: a.name,
      picUrl: a.picUrl || '',
      img1v1Url: a.picUrl || '',
      albumSize: 0,
      alias: [],
      trans: '',
      musicSize: 0,
      topicPerson: 0,
    })),
    al: {
      id: song.album.id?.hashCode?.() || index + 1,
      name: song.album.name,
      picUrl: song.album.picUrl || song.picUrl || '',
      tns: [],
      pic: 0,
    },
    dt: 0,
    fee: 0,
    v: 1,
    cd: '1',
    no: index + 1,
    ftype: 0,
    djId: 0,
    copyright: 0,
    s_id: 0,
    mark: 0,
    originCoverType: 0,
    single: 0,
    mst: 0,
    cp: 0,
    mv: 0,
    rtype: 0,
    publishTime: song.dateAdded ? new Date(song.dateAdded).getTime() : 0,
    picUrl: song.picUrl || song.album.picUrl || '',
    // Extra fields for our use
    _audioUrl: song.audioUrl,
    _lyricsUrl: song.lyricsUrl,
    _notionPageId: song.notionPageId,
  };
}

// ---------- API endpoints ----------

// Config
app.post('/api/config', (req, res) => {
  const { notionToken, databaseId } = req.body;
  if (!notionToken || !databaseId) {
    return res.json({ code: 400, message: 'notionToken and databaseId are required' });
  }
  config.notionToken = notionToken;
  config.databaseId = databaseId;
  // Invalidate cache
  songsCache = [];
  albumsCache = [];
  cacheTimestamp = 0;
  console.log('Config updated:', { databaseId });
  res.json({ code: 200, message: 'ok' });
});

app.get('/api/config', (req, res) => {
  res.json({
    code: 200,
    configured: !!(config.notionToken && config.databaseId),
    databaseId: config.databaseId,
  });
});

// Force refresh cache
app.post('/api/refresh', async (req, res) => {
  try {
    cacheTimestamp = 0;
    await loadSongs();
    res.json({ code: 200, message: 'ok', count: songsCache.length });
  } catch (e) {
    res.json({ code: 500, message: e.message });
  }
});

// Playlist categories — return a single "全部" category
app.get('/playlist/catlist', (req, res) => {
  res.json({
    code: 200,
    all: { name: '全部', resourceCount: albumsCache.length, category: 0 },
    sub: [
      { name: '全部歌曲', category: 0, resourceCount: songsCache.length },
    ],
    categories: { 0: '全部' },
  });
});

// Playlist list — return albums as playlists
app.get('/top/playlist', async (req, res) => {
  try {
    if (!config.notionToken || !config.databaseId) {
      return res.json({ code: 200, playlists: [], more: false, total: 0 });
    }
    await loadSongs();

    const cat = req.query.cat || '全部歌曲';
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 42;

    let playlists;
    if (cat === '全部歌曲') {
      // Return a single "All Songs" playlist
      playlists = [{
        id: 'all-songs',
        name: '全部歌曲',
        coverImgUrl: songsCache[0]?.picUrl || '',
        playCount: songsCache.length,
        trackCount: songsCache.length,
        description: `共 ${songsCache.length} 首歌曲`,
        creator: { nickname: 'Apple Music', avatarUrl: '' },
      }];

      // Also add each album as a separate playlist
      for (const album of albumsCache) {
        playlists.push({
          id: album.id,
          name: album.name,
          coverImgUrl: album.picUrl || '',
          playCount: album.songs.length,
          trackCount: album.songs.length,
          description: `${album.songs.length} 首歌曲`,
          creator: { nickname: 'Apple Music', avatarUrl: '' },
        });
      }
    } else {
      playlists = [];
    }

    const paged = playlists.slice(offset, offset + limit);
    res.json({
      code: 200,
      playlists: paged,
      more: offset + limit < playlists.length,
      total: playlists.length,
    });
  } catch (e) {
    console.error('Error in /top/playlist:', e);
    res.json({ code: 500, message: e.message, playlists: [] });
  }
});

// Playlist detail — return tracks
app.get('/playlist/detail', async (req, res) => {
  try {
    await loadSongs();
    const id = req.query.id;

    let tracks;
    let playlistName;
    let coverUrl = '';

    if (id === 'all-songs') {
      tracks = songsCache;
      playlistName = '全部歌曲';
      coverUrl = songsCache[0]?.picUrl || '';
    } else {
      const album = albumsCache.find(a => a.id === id);
      if (album) {
        tracks = album.songs;
        playlistName = album.name;
        coverUrl = album.picUrl || '';
      } else {
        tracks = [];
        playlistName = 'Not Found';
      }
    }

    const neteaseTracks = tracks.map((s, i) => toNeteaseSong(s, i));

    res.json({
      code: 200,
      playlist: {
        id: id,
        name: playlistName,
        coverImgUrl: coverUrl,
        coverImgId: 0,
        coverImgId_str: '',
        playCount: tracks.length,
        trackCount: tracks.length,
        description: `${tracks.length} 首歌曲`,
        tags: [],
        creator: {
          userId: 0,
          nickname: 'Apple Music',
          avatarUrl: '',
        },
        tracks: neteaseTracks,
        trackIds: neteaseTracks.map(t => ({ id: t.id, v: 1, t: 0, at: 0, uid: 0, rcmdReason: '' })),
        subscribedCount: 0,
        shareCount: 0,
        commentCount: 0,
        subscribed: false,
        ordered: false,
        status: 0,
        specialType: 0,
        createTime: 0,
        updateTime: Date.now(),
        trackUpdateTime: Date.now(),
        trackNumberUpdateTime: Date.now(),
        cloudTrackCount: 0,
        privacy: 0,
        newImported: false,
        highQuality: false,
        opRecommend: false,
        adType: 0,
        userId: 0,
        commentThreadId: '',
        subscribers: [],
      },
      privileges: [],
    });
  } catch (e) {
    console.error('Error in /playlist/detail:', e);
    res.json({ code: 500, message: e.message });
  }
});

// Song URL — return audio file URL from Notion
app.get('/song/url/v1', async (req, res) => {
  try {
    await loadSongs();
    const id = req.query.id;

    const song = songsCache.find(s => s.id === id || s.id === String(id));

    let audioUrl = '';

    // Always re-fetch from Notion to get a fresh signed URL (they expire after ~1h)
    if (song?.notionPageId) {
      try {
        const page = await getPage(song.notionPageId);
        audioUrl = getPropValue(page.properties['音频']) || '';
        if (audioUrl) song.audioUrl = audioUrl; // Update cache
      } catch (e) {
        console.error('Failed to refresh audio URL:', e.message);
        audioUrl = song?.audioUrl || ''; // Fall back to cached URL
      }
    } else {
      audioUrl = song?.audioUrl || '';
    }

    res.json({
      code: 200,
      data: [{
        id: id,
        url: audioUrl,
        br: 320000,
        size: 0,
        md5: '',
        code: audioUrl ? 200 : 404,
        expi: 3600,
        type: 'm4a',
        gain: 0,
        fee: 0,
        payed: 0,
        flag: 0,
        canExtend: false,
        level: 'higher',
        encodeType: 'aac',
        freeTrialPrivilege: { resConsumable: false, userConsumable: false },
        freeTimeTrialPrivilege: { resConsumable: false, userConsumable: false, type: 0, remainTime: 0 },
        urlSource: 0,
      }],
    });
  } catch (e) {
    console.error('Error in /song/url/v1:', e);
    res.json({ code: 500, data: [] });
  }
});

// Song detail
app.get('/song/detail', async (req, res) => {
  try {
    await loadSongs();
    const ids = (req.query.ids || '').split(',').filter(Boolean);

    const songs = ids.map(id => {
      const song = songsCache.find(s => s.id === id || s.id === String(id));
      if (song) return toNeteaseSong(song);
      return {
        name: 'Unknown',
        id,
        ar: [{ id: 0, name: 'Unknown', picUrl: '' }],
        al: { id: 0, name: 'Unknown', picUrl: '' },
        dt: 0,
        picUrl: '',
      };
    });

    res.json({
      code: 200,
      songs,
      privileges: [],
    });
  } catch (e) {
    console.error('Error in /song/detail:', e);
    res.json({ code: 500, songs: [] });
  }
});

// Lyrics
app.get('/lyric/new', async (req, res) => {
  try {
    await loadSongs();
    const id = req.query.id;
    const song = songsCache.find(s => s.id === id || s.id === String(id));

    let lrcText = '';
    if (song?.lyricsUrl) {
      try {
        const lrcRes = await fetch(song.lyricsUrl);
        if (!lrcRes.ok) throw new Error(`HTTP ${lrcRes.status}`);
        lrcText = await lrcRes.text();
      } catch (e) {
        // Cached URL may have expired — re-fetch the page from Notion
        console.warn('Lyrics URL expired, re-fetching from Notion:', e.message);
        if (song.notionPageId) {
          try {
            const page = await getPage(song.notionPageId);
            const freshUrl = getPropValue(page.properties['歌词']);
            if (freshUrl) {
              song.lyricsUrl = freshUrl;
              const retry = await fetch(freshUrl);
              if (retry.ok) lrcText = await retry.text();
            }
          } catch (e2) {
            console.error('Failed to re-fetch lyrics from Notion:', e2.message);
          }
        }
      }
    }

    res.json({
      code: 200,
      lrc: { version: 1, lyric: lrcText },
      tlyric: { version: 0, lyric: '' },
      romalrc: { version: 0, lyric: '' },
      yrc: { version: 0, lyric: '' },
    });
  } catch (e) {
    res.json({ code: 200, lrc: { version: 1, lyric: '' }, tlyric: { version: 0, lyric: '' } });
  }
});

// Fallback — return empty for unsupported endpoints
app.all('*', (req, res) => {
  console.log(`Unhandled: ${req.method} ${req.url}`);
  res.json({ code: 200 });
});

// ---------- Start ----------

const PORT = process.env.PORT || 30488;
app.listen(PORT, () => {
  console.log(`Notion Music API server running on http://127.0.0.1:${PORT}`);
});
