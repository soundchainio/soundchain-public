/**
 * Open-source emote catalog for the avatar picker.
 *
 * Frank's directive May 4: "i need way more emote options" + "dig for every
 * emote available". So we pull from FOUR public catalogs on modal open:
 *
 *   1. STATIC_SC_EMOTES — curated 7TV V3 ULID-format favorites that are
 *      stable and known-working. Loads instantly, no network. The brittle
 *      V2-hex-format IDs (60ae...60b0 prefixes) have been stripped because
 *      many redirect to V3 successors that 404.
 *   2. 7TV global set + searchSevenTv() — community animated emotes,
 *      hundreds of them, with on-demand search via GraphQL.
 *   3. BetterTTV global — `https://api.betterttv.net/3/cached/emotes/global`,
 *      ~50 reliable emotes, no auth.
 *   4. FrankerFaceZ global — `https://api.frankerfacez.com/v1/set/global`,
 *      ~50 emotes, no auth.
 *   5. Twitch global — static curated IDs (Twitch CDN serves public
 *      emoji by ID without auth).
 *
 * Render: any avatar string starting with one of the allowed CDN hosts
 * goes through isUrlAvatar() in identity.ts and renders as <img>. Server
 * validates the host in chat.ts to defend against arbitrary remote URLs.
 */

export type ArenaEmote = {
  id: string
  name: string
  url: string
}

const SEVEN_TV_CDN = 'https://cdn.7tv.app/emote'
const BTTV_CDN = 'https://cdn.betterttv.net/emote'
const TWITCH_CDN = 'https://static-cdn.jtvnw.net/emoticons/v2'

function buildSevenTv(id: string, name: string): ArenaEmote {
  return { id: `s7-${id}`, name, url: `${SEVEN_TV_CDN}/${id}/2x` }
}

// --- LAYER 1: Static, instant-loading favorites --------------------------------
//
// All in V3 ULID format (01F*/01G*/01H*) which are 7TV-native and don't go
// through the brittle V2-redirect path. Confirmed reachable via curl.
export const STATIC_SC_EMOTES: ArenaEmote[] = [
  buildSevenTv('01F2ZWD6CR000DSBG200DM9SGM', 'pepeD'),
  buildSevenTv('01EZY967K0000CYST6006V20T8', 'pepeJAM'),
  buildSevenTv('01F6MXRSC00009HX192HR1XME9', 'pepeJAMJAM'),
  buildSevenTv('01G3BNV55000068RCV6YVN340R', 'catPls'),
  buildSevenTv('01FJAV4EJG000FZHS49NWQRPND', 'catDance'),
  buildSevenTv('01F6N14GMG000AR0YATR3RKYTC', 'spongePls'),
  buildSevenTv('01F6VS6DR8000ECZXVKQBJ42S0', 'vibePls'),
  buildSevenTv('01FSJ0HVKG0001Z3WXBKV36R0Z', 'poroPls'),
  buildSevenTv('01FZ5KJ818000B4AWRZNMVN880', 'danse'),
  buildSevenTv('01HTZ8GEWR0007838DQ0AM7RA2', 'pedro'),
  buildSevenTv('01F6TDN2V0000E7TRSM97WER0J', 'FrogDance'),
  buildSevenTv('01GA0HWQ7R0001VT2F11KM5EZM', 'Jigglin'),
  buildSevenTv('01G3KYTKXR000ET2J0MQP5Y06S', 'PagBounce'),
  buildSevenTv('01GVKDB7R8000C1XHZ2SH6CRQA', 'bop'),
  buildSevenTv('01F6ME9FRG0005TFYTWP1H8R42', 'catJam'),
  buildSevenTv('01F6Q7D0S80001K6WGNZJBQNC1', 'pepeBASS'),
  buildSevenTv('01F6W1T7XR0002M7WQ84WYZ5HF', 'EDM'),
  buildSevenTv('01F6MDM7380000WDA7ERT6VTFQ', 'GuitarTime'),
  buildSevenTv('01F6MKBDD00009C9ZSNZTDTB9A', 'DrumTime'),
  buildSevenTv('01F6MWWB70000EMM7M7JFFF2ZC', 'TrumpetTime'),
  buildSevenTv('01G611X31800020B4JB4BJGS5N', 'Headbang'),
  buildSevenTv('01F9W4QQN0000DG20CB692XPMJ', 'djShaq'),
  buildSevenTv('01J85F52A0000DNWJ3ST67GVF0', 'kittyJam'),
  buildSevenTv('01GCN0JF60000D8ZK13J8KVD8A', 'RaveTime'),
  buildSevenTv('01G1N23CNR0004YN3NKDRRA04H', 'RAVE'),
  buildSevenTv('01F6TDT0280005G9TG05W2BXMB', 'PartyKirby'),
  buildSevenTv('01GSRDK64G000FG1RDMKJ4Q0H1', 'YIPPIE'),
  buildSevenTv('01GFKMBAHG0007SC7A230SCCYX', 'peepoCheer'),
  buildSevenTv('01H9D5QNVR0005XNK7Z4N9D90F', 'catClap'),
  buildSevenTv('01F6RD7B88000B4N55W5NS55R7', 'LETSGO'),
  buildSevenTv('01FDC150C8000F43V49GZTVECJ', 'HYPERYump'),
  buildSevenTv('01F6T6GJB0000DDVB8PWZQ53NQ', 'PogTasty'),
  buildSevenTv('01H1SDVRH000080K50KTZJ6NH9', 'BANGER'),
  buildSevenTv('01F7VQR9BR00012GPWP0G6X5NF', 'FIRE'),
  buildSevenTv('01GFRG067R000DQSEG934QMZ0C', 'Bussin'),
  buildSevenTv('01FYQZVG280006SX8JX4TD7SJA', 'VIBE'),
  buildSevenTv('01FAPFR2T80009222ZMH048914', 'Chillin'),
  buildSevenTv('01F6MAWT78000B5V5G2M2MJBDY', 'peepoCoffee'),
  buildSevenTv('01HBNNK50R0006HD9P1VTRJZSK', 'Lissen'),
  buildSevenTv('01G5VHG3CG000AM0RPEKKRCFBR', 'catPunch'),
  buildSevenTv('01HMBZSBD00004EWJWE421Y80X', 'catSlap'),
  buildSevenTv('01FE3XY508000AA32JP519W2EW', 'PETPET'),
  buildSevenTv('01F6N7ZY4000052X5637DG0KTC', 'peepoPat'),
  buildSevenTv('01HP9MYD2G0003S4PACH9JQK2C', 'wave'),
  buildSevenTv('01FNMBRDN8000EJT2EVEY3EM1H', 'catNOD'),
  buildSevenTv('01GGMQ2M7R00084ZHXKAP9XDJT', 'CatHeart'),
  buildSevenTv('01FYKTPW780009C6Z6S6QKTJ1R', 'catLove'),
  buildSevenTv('01F9CMPV18000FG9EXKNPZVK6F', 'MoneyTime'),
  buildSevenTv('01F8X2WQBR000492R7CBZS5B5W', 'pepeMoney'),
  buildSevenTv('01G9FN8YF000080GCW6BK847N1', 'MONKE'),
  buildSevenTv('01FCY771D800007PQ2DF3GDTN6', 'RainTime'),
]

// --- LAYER 2: Twitch global static IDs ----------------------------------------
// Public emote IDs from Twitch's CDN. Image URL pattern works without auth.
const TWITCH_GLOBAL_IDS: Array<{ id: string; name: string }> = [
  { id: '25', name: 'Kappa' },
  { id: '86', name: 'BibleThump' },
  { id: '88', name: 'PogChamp' },
  { id: '354', name: '4Head' },
  { id: '425618', name: 'LUL' },
  { id: '30259', name: 'HeyGuys' },
  { id: '28', name: 'MrDestructoid' },
  { id: '36', name: 'PJSalt' },
  { id: '41', name: 'Kreygasm' },
  { id: '58765', name: 'NotLikeThis' },
  { id: '68856', name: 'WutFace' },
  { id: '33', name: 'DansGame' },
  { id: '114836', name: 'CoolStoryBob' },
  { id: '425688', name: 'SeemsGood' },
  { id: '81274', name: 'VoHiYo' },
  { id: '425614', name: 'FailFish' },
  { id: '46881', name: 'AngelThump' },
  { id: '80393', name: 'TriHard' },
  { id: '120232', name: 'CorgiDerp' },
  { id: '52', name: 'SMOrc' },
  { id: '244', name: 'FrankerZ' },
  { id: '11', name: 'JKanStyle' },
  { id: '73', name: 'OptimizePrime' },
  { id: '12', name: 'OneHand' },
  { id: '15', name: 'PunchTrees' },
  { id: '16', name: 'PunOko' },
  { id: '34', name: 'StoneLightning' },
  { id: '40', name: 'KevinTurtle' },
  { id: '47', name: 'MVGame' },
  { id: '50', name: 'ItsBoshyTime' },
]

export const TWITCH_EMOTES: ArenaEmote[] = TWITCH_GLOBAL_IDS.map((t) => ({
  id: `tw-${t.id}`,
  name: t.name,
  url: `${TWITCH_CDN}/${t.id}/default/dark/2.0`,
}))

// --- LAYER 3: Live external fetches (cached after first load) -----------------
let externalCache: ArenaEmote[] | null = null
let externalPromise: Promise<ArenaEmote[]> | null = null

async function fetch7tvGlobal(): Promise<ArenaEmote[]> {
  try {
    const r = await fetch('https://7tv.io/v3/emote-sets/global')
    if (!r.ok) return []
    const j = await r.json()
    const items: any[] = j?.emotes || []
    return items.map((e) => ({
      id: `s7g-${e.id}`,
      name: e.name as string,
      url: `${SEVEN_TV_CDN}/${e.id}/2x`,
    }))
  } catch {
    return []
  }
}

async function fetchBttvGlobal(): Promise<ArenaEmote[]> {
  try {
    const r = await fetch('https://api.betterttv.net/3/cached/emotes/global')
    if (!r.ok) return []
    const items: any[] = await r.json()
    return items.map((e) => ({
      id: `btv-${e.id}`,
      name: e.code as string,
      url: `${BTTV_CDN}/${e.id}/2x.${e.imageType || 'webp'}`,
    }))
  } catch {
    return []
  }
}

async function fetchFfzGlobal(): Promise<ArenaEmote[]> {
  try {
    const r = await fetch('https://api.frankerfacez.com/v1/set/global')
    if (!r.ok) return []
    const j = await r.json()
    const out: ArenaEmote[] = []
    const sets = j?.sets || {}
    for (const setKey of Object.keys(sets)) {
      const emotes: any[] = sets[setKey]?.emoticons || []
      for (const e of emotes) {
        const urls = e?.urls || {}
        const url = urls['2'] || urls['1'] || urls['4']
        if (!url) continue
        // FFZ urls may come in protocol-relative form (//cdn.frankerfacez.com/...).
        const full = url.startsWith('//') ? `https:${url}` : url
        out.push({ id: `ffz-${e.id}`, name: e.name, url: full })
      }
    }
    return out
  } catch {
    return []
  }
}

/**
 * Fetch all external catalogs in parallel, dedupe by URL, cache for the rest of
 * the session. Safe to call multiple times — second + later calls share the
 * promise so we never refetch.
 */
export function fetchExternalEmotes(): Promise<ArenaEmote[]> {
  if (externalCache) return Promise.resolve(externalCache)
  if (externalPromise) return externalPromise
  externalPromise = (async () => {
    const [seven, bttv, ffz] = await Promise.all([
      fetch7tvGlobal(),
      fetchBttvGlobal(),
      fetchFfzGlobal(),
    ])
    const seen = new Set<string>()
    const out: ArenaEmote[] = []
    for (const list of [seven, bttv, ffz]) {
      for (const e of list) {
        if (seen.has(e.url)) continue
        seen.add(e.url)
        out.push(e)
      }
    }
    externalCache = out
    return out
  })()
  return externalPromise
}

/**
 * Live search the 7TV public catalog via their GraphQL endpoint. No auth key.
 * Returns up to `limit` results, deduped by id. Caller renders the URL the
 * same way SC_EMOTES does.
 *
 * 7TV's REST `/v3/emotes` is list-only; search lives at /v3/gql.
 */
export async function searchSevenTv(query: string, limit = 100): Promise<ArenaEmote[]> {
  const q = query.trim()
  if (!q) return []
  const body = {
    query: 'query($query:String!,$limit:Int){emotes(query:$query,limit:$limit){items{id name animated}}}',
    variables: { query: q, limit },
  }
  try {
    const resp = await fetch('https://7tv.io/v3/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!resp.ok) return []
    const data = await resp.json()
    const items: any[] = data?.data?.emotes?.items || []
    const seen = new Set<string>()
    const out: ArenaEmote[] = []
    for (const e of items) {
      const id = e?.id
      const name = e?.name
      if (!id || !name || seen.has(id)) continue
      seen.add(id)
      out.push({ id: `s7-${id}`, name, url: `${SEVEN_TV_CDN}/${id}/2x` })
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}

// Backwards-compat export for the prior import name in GameChat.tsx
export const SC_EMOTES = STATIC_SC_EMOTES
