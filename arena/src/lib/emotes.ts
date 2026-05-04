/**
 * Open-source emote catalog for the avatar picker.
 *
 * Two layers:
 *
 *   1. SC_EMOTES — curated 7TV emote list mirrored from the SoundChain
 *      web/ StickerPicker (CLAUDE.md Feb 2-3 2026 ship). ~140 animated
 *      community emotes hosted on cdn.7tv.app/emote/{id}/2x. No API call,
 *      no rate limit, just a static URL list. Free for any client.
 *      Mirrored (not imported) per the arena/ vs web/ "no cross-project
 *      imports" rule (CLAUDE.md May 2 split, c3a688a).
 *
 *   2. searchSevenTv() — calls 7TV's public REST API
 *      (https://7tv.io/v3/emotes?query=...) for "endless options". No auth
 *      key needed. Returns up to 50 hits per query. Render path is the
 *      same as SC_EMOTES — just the URL string.
 *
 * Render: any avatar string starting with https://cdn.7tv.app/ goes through
 * isUrlAvatar() in identity.ts and renders as <img>. Server validates the
 * host in chat.ts so users can't substitute arbitrary remote URLs.
 */

export type ArenaEmote = {
  id: string
  name: string
  url: string
}

const SEVEN_TV_CDN = 'https://cdn.7tv.app/emote'

function buildSevenTv(id: string, name: string): ArenaEmote {
  return { id: `sc-${id}`, name, url: `${SEVEN_TV_CDN}/${id}/2x` }
}

// Curated SoundChain favorites from web/src/components/StickerPicker.tsx.
// All animated, all 7TV-hosted, all free to use. Order = display order in the
// avatar picker (vibey/popular ones first so people see them without scrolling).
export const SC_EMOTES: ArenaEmote[] = [
  // Classic reactions
  buildSevenTv('60aec9186d0b8c60ac0be7c0', 'catJAM'),
  buildSevenTv('60ae8cac229664e8667ae5a8', 'pepeD'),
  buildSevenTv('60ae958e229664e8667aea38', 'KEKW'),
  buildSevenTv('60b04b4a77ccd81f2b77d67d', 'LULW'),
  buildSevenTv('60b0d3ec8ed8b373e421e7a7', 'OMEGALUL'),
  buildSevenTv('60aefc43ff8a9a15a6de5847', 'PepeLaugh'),
  buildSevenTv('60ae3fd1229664e8667ab074', 'Sadge'),
  buildSevenTv('60af9fdde5e3c23f8a6dea93', 'Copium'),
  buildSevenTv('60af1b9eaa0d72dc39f1ea0f', 'Aware'),
  buildSevenTv('60b0d3c3daa8fb57cd62c5db', 'monkaS'),
  buildSevenTv('60b0d3d4a5de6cf21b5ea84e', 'PogU'),
  buildSevenTv('60b0d3a7a5de6cf21b5ea83b', 'FeelsGoodMan'),
  buildSevenTv('60b0d3b5a5de6cf21b5ea842', 'FeelsBadMan'),
  buildSevenTv('60afe3c580df1e6b58fd7f3f', 'NODDERS'),
  buildSevenTv('60af3bfc77ccd81f2b76a2c3', 'PauseChamp'),
  buildSevenTv('60b0d53e77ccd81f2b78c1c0', 'peepoHappy'),
  buildSevenTv('60b0d577f0e6f5574632aad8', 'peepoSad'),
  buildSevenTv('60af2c40aa0d72dc39f1c3e4', 'Clap'),
  buildSevenTv('60b04bc4daa8fb57cd61b38c', 'WAYTOODANK'),
  buildSevenTv('60af69b37e08e07de9d40f04', 'Pepega'),
  buildSevenTv('60ae4aa5229664e8667ab8ef', 'HYPERS'),
  buildSevenTv('60ae4dc1229664e8667ab9d9', 'PepeHands'),
  buildSevenTv('60af14f4e5e3c23f8a6dd802', 'WideHard'),
  buildSevenTv('60af3c7e229664e8667ac2eb', 'Prayge'),
  buildSevenTv('60b0d3f1daa8fb57cd62c5e6', 'EZ'),
  buildSevenTv('60b0d43b77ccd81f2b78ba37', 'forsenCD'),
  buildSevenTv('60af2d01aa0d72dc39f1c470', 'CoolCat'),
  buildSevenTv('60b0d42e77ccd81f2b78ba2d', 'monkaW'),
  buildSevenTv('60af3d5ee5e3c23f8a6ddc9e', 'HACKERMANS'),
  buildSevenTv('60b0d3df77ccd81f2b78b963', 'TriHard'),
  // Popular characters
  buildSevenTv('60b0bb0f8ed8b373e421cf47', 'Chatting'),
  buildSevenTv('60ae7be1ff8a9a15a6de0e3e', 'GIGACHAD'),
  buildSevenTv('60ae9f49ff8a9a15a6de5f93', 'Clueless'),
  buildSevenTv('60ae37d7229664e8667ab051', 'Bedge'),
  buildSevenTv('60b076aea64e9d892a82d9f1', 'BOOBA'),
  buildSevenTv('60af7df477ccd81f2b77196d', 'modCheck'),
  buildSevenTv('60b0bca1e5e3c23f8a6e24f1', 'Stare'),
  buildSevenTv('60b09eb777ccd81f2b78dbd9', 'BASED'),
  buildSevenTv('60b09c1477ccd81f2b78db76', 'DESPAIR'),
  buildSevenTv('60b0a9aba64e9d892a82dd3b', 'Susge'),
  buildSevenTv('60b09e93e5e3c23f8a6e1f48', 'NOTED'),
  buildSevenTv('60b0952ee5e3c23f8a6e1cfe', 'CAUGHT'),
  buildSevenTv('60b0bfd6e5e3c23f8a6e25f7', 'FeelsStrongMan'),
  buildSevenTv('60b109e077ccd81f2b78fc0c', 'peepoArrive'),
  buildSevenTv('60b10a61a64e9d892a83081b', 'peepoLeave'),
  buildSevenTv('60b11106a64e9d892a830d7c', 'peepoRiot'),
  buildSevenTv('60b112648ed8b373e42210b5', 'peepoSit'),
  buildSevenTv('60b11aab6a76e2db2da56f59', 'peepoClap'),
  buildSevenTv('60b1195d6a76e2db2da56e83', 'peepoGiggles'),
  buildSevenTv('60b11b38e5e3c23f8a6e340a', 'peepoBlush'),
  buildSevenTv('60b0d50b8ed8b373e421e7c1', 'POGGERS'),
  buildSevenTv('60b0d51c8ed8b373e421e7c5', 'WeirdChamp'),
  buildSevenTv('60b0d4e0daa8fb57cd62c638', 'Pepepains'),
  buildSevenTv('60b0d4cba5de6cf21b5ea87e', 'ICANT'),
  buildSevenTv('60b0d4b3a5de6cf21b5ea877', 'Okayge'),
  buildSevenTv('60b0d49a77ccd81f2b78babb', 'NOIDONTTHINKSO'),
  buildSevenTv('60b0d464daa8fb57cd62c609', 'xqcL'),
  buildSevenTv('60b0d44fdaa8fb57cd62c5fe', 'LETSGO'),
  buildSevenTv('60b0d4188ed8b373e421e7a8', 'Madge'),
  buildSevenTv('60b0d401daa8fb57cd62c5f2', 'Pepepls'),
  buildSevenTv('60b0d3be77ccd81f2b78b950', 'PETTHE'),
  buildSevenTv('60b0c0ce8ed8b373e421e68d', 'lebronJAM'),
  // Dance & groove
  buildSevenTv('60b0d555daa8fb57cd62c64b', 'pepeDS'),
  buildSevenTv('60b0d59da5de6cf21b5ea8a7', 'RainbowPls'),
  buildSevenTv('60b0d5b0a5de6cf21b5ea8ad', 'DinkDonk'),
  buildSevenTv('60b0d618daa8fb57cd62c66b', 'WIGGLE'),
  buildSevenTv('60b0d63ea5de6cf21b5ea8d1', 'Dance'),
  buildSevenTv('60b0d6bed83ef0fc71e8e0e8', 'HyperPls'),
  buildSevenTv('01F2ZWD6CR000DSBG200DM9SGM', 'pepeD2'),
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
  // Music & DJ
  buildSevenTv('01F6ME9FRG0005TFYTWP1H8R42', 'catJam2'),
  buildSevenTv('01F6Q7D0S80001K6WGNZJBQNC1', 'pepeBASS'),
  buildSevenTv('01F6W1T7XR0002M7WQ84WYZ5HF', 'EDM'),
  buildSevenTv('01F6MDM7380000WDA7ERT6VTFQ', 'GuitarTime'),
  buildSevenTv('01F6MKBDD00009C9ZSNZTDTB9A', 'DrumTime'),
  buildSevenTv('01F6MWWB70000EMM7M7JFFF2ZC', 'TrumpetTime'),
  buildSevenTv('01G611X31800020B4JB4BJGS5N', 'Headbang'),
  buildSevenTv('01F9W4QQN0000DG20CB692XPMJ', 'djShaq'),
  buildSevenTv('01J85F52A0000DNWJ3ST67GVF0', 'kittyJam'),
  buildSevenTv('60b0d6978ed8b373e421e808', 'Jamming'),
  // Rave / party / hype
  buildSevenTv('01GCN0JF60000D8ZK13J8KVD8A', 'RaveTime'),
  buildSevenTv('01G1N23CNR0004YN3NKDRRA04H', 'RAVE'),
  buildSevenTv('01F6TDT0280005G9TG05W2BXMB', 'PartyKirby'),
  buildSevenTv('01GSRDK64G000FG1RDMKJ4Q0H1', 'YIPPIE'),
  buildSevenTv('01GFKMBAHG0007SC7A230SCCYX', 'peepoCheer'),
  buildSevenTv('01H9D5QNVR0005XNK7Z4N9D90F', 'catClap'),
  buildSevenTv('60b0d62c77ccd81f2b78c208', 'bongoTap'),
  buildSevenTv('01F6RD7B88000B4N55W5NS55R7', 'LETSGO2'),
  buildSevenTv('01FDC150C8000F43V49GZTVECJ', 'HYPERYump'),
  buildSevenTv('01F6T6GJB0000DDVB8PWZQ53NQ', 'PogTasty'),
  buildSevenTv('01H1SDVRH000080K50KTZJ6NH9', 'BANGER'),
  buildSevenTv('01F7VQR9BR00012GPWP0G6X5NF', 'FIRE'),
  buildSevenTv('01GFRG067R000DQSEG934QMZ0C', 'Bussin'),
  // Vibe / chill
  buildSevenTv('01FYQZVG280006SX8JX4TD7SJA', 'VIBE'),
  buildSevenTv('01FAPFR2T80009222ZMH048914', 'Chillin'),
  buildSevenTv('01F6MAWT78000B5V5G2M2MJBDY', 'peepoCoffee'),
  buildSevenTv('01HBNNK50R0006HD9P1VTRJZSK', 'Lissen'),
  buildSevenTv('60b0d6aa8ed8b373e421e80e', 'vibing'),
  buildSevenTv('60b0d5c4a5de6cf21b5ea8b3', 'SmokeTime'),
  // Action / cute
  buildSevenTv('01G5VHG3CG000AM0RPEKKRCFBR', 'catPunch'),
  buildSevenTv('01HMBZSBD00004EWJWE421Y80X', 'catSlap'),
  buildSevenTv('01FE3XY508000AA32JP519W2EW', 'PETPET'),
  buildSevenTv('01F6N7ZY4000052X5637DG0KTC', 'peepoPat'),
  buildSevenTv('01HP9MYD2G0003S4PACH9JQK2C', 'wave'),
  buildSevenTv('01FNMBRDN8000EJT2EVEY3EM1H', 'catNOD'),
  buildSevenTv('01GGMQ2M7R00084ZHXKAP9XDJT', 'CatHeart'),
  buildSevenTv('01FYKTPW780009C6Z6S6QKTJ1R', 'catLove'),
  buildSevenTv('60b11c21e5e3c23f8a6e34a1', 'peepoRun'),
  buildSevenTv('60b10cf477ccd81f2b78fc85', 'peepoWave'),
  buildSevenTv('60b0d672a5de6cf21b5ea8e1', 'Popcorn'),
  // Money / flex / yes/no
  buildSevenTv('01F9CMPV18000FG9EXKNPZVK6F', 'MoneyTime'),
  buildSevenTv('01F8X2WQBR000492R7CBZS5B5W', 'pepeMoney'),
  buildSevenTv('01G9FN8YF000080GCW6BK847N1', 'MONKE'),
  buildSevenTv('60b0d5d98ed8b373e421e7e6', 'YEP'),
  buildSevenTv('60b0d5e877ccd81f2b78c1e2', 'NOPE'),
  buildSevenTv('60b0d5f6daa8fb57cd62c65d', 'HUHH'),
  buildSevenTv('60b0d607daa8fb57cd62c663', 'ThisIsFine'),
]

/**
 * Live search the 7TV public catalog. No API key. Returns up to `limit`
 * results, deduped by id. Caller renders the URL the same way SC_EMOTES does.
 *
 * Public docs: https://7tv.io/docs (REST endpoint /v3/emotes)
 */
export async function searchSevenTv(query: string, limit = 50): Promise<ArenaEmote[]> {
  const q = query.trim()
  if (!q) return []
  // 7TV REST: filter by exact-name OR fuzzy. We use fuzzy + animated for fun results.
  const url = `https://7tv.io/v3/emotes?query=${encodeURIComponent(q)}&limit=${limit}&filter[exact_match]=false&filter[case_sensitive]=false&filter[animated]=true`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return []
    const data = await resp.json()
    const items: any[] = data?.items || data?.emotes?.items || []
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
