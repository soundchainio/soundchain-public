/**
 * GET /api/playlists/list — Vercel-direct replacement for useGetUserPlaylistsQuery
 *
 * ?profileId=xxx — playlists by user (required)
 * ?playlistId=xxx — single playlist with tracks
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import clientPromise from 'lib/mongodb'
import { ObjectId } from 'mongodb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const profileId = req.query.profileId as string
  const playlistId = req.query.playlistId as string

  try {
    const client = await clientPromise
    const db = client.db('soundchain')

    // ── Global Playlists Explore — every playlist on the site ────────────
    // GET ?scope=global&sort=played|recent|tracks&genre=hip-hop&limit=60
    // Powers the /playlists page (the Playlists pill, deck aesthetic). Joins
    // creator profile + member tracks for play totals / genres / cover.
    if ((req.query.scope as string) === 'global') {
      const sort = (req.query.sort as string) || 'played'
      const genreFilter = req.query.genre as string
      const limit = Math.min(parseInt(req.query.limit as string) || 60, 100)

      // Working set — newest 300 non-deleted playlists, then ranked in-memory.
      const raw = await db.collection('playlists')
        .find({ deleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .limit(300)
        .toArray()

      // Tracks live in the `playlisttracks` join collection. Each row is
      // { playlistId, trackId?, sourceType, title, artist, artworkUrl, position }.
      // EMBED tracks (YouTube/SoundCloud) carry inline metadata and have NO
      // trackId — so never blindly .toString() a trackId; guard everything.
      const playlistOids = raw.map(p => p._id)
      const links = playlistOids.length
        ? await db.collection('playlisttracks')
            .find({ playlistId: { $in: playlistOids } })
            .sort({ position: 1 })
            .toArray()
        : []
      const linksByPlaylist = new Map<string, any[]>()
      const trackOids: ObjectId[] = []
      for (const ln of links) {
        if (!ln.playlistId) continue
        const k = ln.playlistId.toString()
        if (!linksByPlaylist.has(k)) linksByPlaylist.set(k, [])
        linksByPlaylist.get(k)!.push(ln)
        if (ln.trackId) { try { trackOids.push(new ObjectId(ln.trackId)) } catch { /* skip */ } }
      }

      const trackById = new Map<string, any>()
      if (trackOids.length) {
        const tks = await db.collection('tracks')
          .find({ _id: { $in: trackOids } })
          .project({ playbackCount: 1, genres: 1, artworkUrl: 1 })
          .toArray()
        for (const t of tks) trackById.set(t._id.toString(), t)
      }

      const profileOids: ObjectId[] = []
      for (const p of raw) {
        if (p.profileId) { try { profileOids.push(new ObjectId(p.profileId)) } catch { /* skip */ } }
      }
      const creatorById = new Map<string, any>()
      if (profileOids.length) {
        const profs = await db.collection('profiles')
          .find({ _id: { $in: profileOids } })
          .project({ displayName: 1, userHandle: 1, profilePicture: 1 })
          .toArray()
        for (const pr of profs) creatorById.set(pr._id.toString(), pr)
      }

      let nodes = raw.map(p => {
        const plLinks = linksByPlaylist.get(p._id.toString()) || []
        const gc: Record<string, number> = {}
        let cover = p.coverImage || p.artworkUrl || null
        for (const ln of plLinks) {
          if (!cover && ln.artworkUrl) cover = ln.artworkUrl
          const tk = ln.trackId ? trackById.get(ln.trackId.toString()) : null
          if (tk) {
            if (!cover && tk.artworkUrl) cover = tk.artworkUrl
            for (const g of (tk.genres || [])) gc[g] = (gc[g] || 0) + 1
          }
        }
        const genres = Object.keys(gc).sort((a, b) => gc[b] - gc[a]).slice(0, 3)
        const cr = creatorById.get(p.profileId ? p.profileId.toString() : '') || {}
        return {
          id: p._id.toString(),
          title: p.title || 'Untitled',
          description: p.description || '',
          coverImage: cover,
          trackCount: plLinks.length,
          totalPlays: p.playbackCount || 0, // playlist-level play count = "most played"
          genres,
          profileId: p.profileId?.toString() || null,
          creatorName: cr.displayName || cr.userHandle || 'Unknown',
          creatorHandle: cr.userHandle || '',
          creatorAvatar: cr.profilePicture || null,
          createdAt: p.createdAt || null,
        }
      })
      // NOTE: not hiding empty playlists during this build/test phase so the
      // real community playlists are visible while they're being populated.
      // Re-enable `.filter(n => n.trackCount > 0)` once there's volume.

      if (genreFilter) nodes = nodes.filter(n => n.genres.includes(genreFilter))

      nodes.sort((a, b) =>
        sort === 'recent' ? (+new Date(b.createdAt || 0) - +new Date(a.createdAt || 0))
        : sort === 'tracks' ? (b.trackCount - a.trackCount)
        : (b.totalPlays - a.totalPlays)) // played (default)

      // Genre chips for the filter rail — most common first.
      const gset: Record<string, number> = {}
      for (const n of nodes) for (const g of n.genres) gset[g] = (gset[g] || 0) + 1
      const allGenres = Object.keys(gset).sort((a, b) => gset[b] - gset[a])

      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
      return res.status(200).json({ nodes: nodes.slice(0, limit), genres: allGenres })
    }

    // Single playlist with tracks
    if (playlistId) {
      let oid: ObjectId
      try { oid = new ObjectId(playlistId) } catch { return res.status(400).json({ error: 'Invalid playlist id' }) }
      const playlist = await db.collection('playlists').findOne({ _id: oid })
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' })

      // Songs live in `playlisttracks` (NOT on the playlist doc). Each row is an
      // SC track (has trackId → hydrate from `tracks`) OR an embed track
      // (YouTube/SoundCloud — inline title/artwork + externalUrl, no trackId).
      const links = await db.collection('playlisttracks')
        .find({ playlistId: oid })
        .sort({ position: 1 })
        .toArray()

      const trackOids = links.map(l => l.trackId).filter(Boolean)
      const trackById = new Map<string, any>()
      if (trackOids.length) {
        const tks = await db.collection('tracks').find({ _id: { $in: trackOids } }).toArray()
        for (const t of tks) trackById.set(t._id.toString(), t)
      }

      // Shape each node exactly as PlaylistDetail expects (playback reads
      // externalUrl + sourceType for embeds; trackId + track for SC tracks).
      const nodes = links.map(l => {
        const tk = l.trackId ? trackById.get(l.trackId.toString()) : null
        return {
          id: l._id.toString(),
          // Enum is UPPERCASE ('YOUTUBE','NFT'); old rows stored lowercase — normalize.
          sourceType: l.sourceType ? String(l.sourceType).toUpperCase() : (l.trackId ? 'NFT' : null),
          trackId: l.trackId?.toString() || null,
          title: l.title || tk?.title || '',
          artist: l.artist || tk?.artist || '',
          artworkUrl: l.artworkUrl || tk?.artworkUrl || null,
          externalUrl: l.externalUrl || l.url || null,
          uploadedFileUrl: l.uploadedFileUrl || null,
          duration: l.duration ?? tk?.duration ?? null,
          track: tk ? {
            id: tk._id.toString(),
            title: tk.title || '',
            artist: tk.artist || '',
            artworkUrl: tk.artworkUrl || '',
            playbackUrl: tk.playbackUrl || tk.assetUrl || '',
            assetUrl: tk.assetUrl || '',
          } : null,
        }
      })

      return res.status(200).json({
        playlist: {
          id: playlist._id.toString(),
          title: playlist.title || '',
          description: playlist.description || '',
          artworkUrl: playlist.artworkUrl || playlist.coverImage || null,
          coverImage: playlist.coverImage || playlist.artworkUrl || null,
          profileId: playlist.profileId?.toString() || null,
          favoriteCount: playlist.favoriteCount || 0,
          followCount: playlist.followCount || 0,
          importStatus: playlist.importStatus || null,
          createdAt: playlist.createdAt || null,
          updatedAt: playlist.updatedAt || null,
          tracks: { nodes },
        },
      })
    }

    // List playlists by user
    if (!profileId) return res.status(400).json({ error: 'profileId or playlistId required' })

    const playlists = await db.collection('playlists')
      .find({ profileId: new ObjectId(profileId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    const nodes = playlists.map(p => ({
      id: p._id.toString(),
      title: p.title || '',
      description: p.description || '',
      coverImage: p.coverImage || null,
      trackCount: (p.tracks || []).length,
      profileId: p.profileId?.toString() || null,
      createdAt: p.createdAt || null,
    }))

    return res.status(200).json({ nodes })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
