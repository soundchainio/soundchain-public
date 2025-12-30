#!/bin/bash
#
# Post SoundChain announcements to the feed
# Usage: ./post-announcements.sh
#
# Requires: SOUNDCHAIN_ANNOUNCEMENT_KEY environment variable
#

API_URL="https://api.soundchain.io/v1/announcements"

# Check for API key
if [ -z "$SOUNDCHAIN_ANNOUNCEMENT_KEY" ]; then
  echo "❌ Error: SOUNDCHAIN_ANNOUNCEMENT_KEY not set"
  echo "Run the migration first to get the key, then:"
  echo "export SOUNDCHAIN_ANNOUNCEMENT_KEY=sc_live_xxxxx"
  exit 1
fi

post_announcement() {
  local title="$1"
  local content="$2"
  local type="$3"
  local link="$4"
  local tags="$5"

  echo "📢 Posting: $title"

  response=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $SOUNDCHAIN_ANNOUNCEMENT_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"$title\",
      \"content\": \"$content\",
      \"type\": \"$type\",
      \"link\": \"$link\",
      \"tags\": $tags
    }")

  if echo "$response" | grep -q '"success":true'; then
    echo "✅ Posted successfully!"
  else
    echo "❌ Failed: $response"
  fi
  echo ""
  sleep 1
}

echo "🚀 SoundChain Announcement Blast!"
echo "=================================="
echo ""

# Announcement 1: Developer Platform
post_announcement \
  "🚀 Developer Platform is LIVE!" \
  "Startups can now post announcements to SoundChain via simple curl requests! Get your API key and start reaching the Web3 music community. Rate limits: FREE (100/day), PRO (1000/day), ENTERPRISE (unlimited)." \
  "PRODUCT_LAUNCH" \
  "https://soundchain.io/developers" \
  '["developers", "api", "startups", "web3"]'

# Announcement 2: IPFS Migration Complete
post_announcement \
  "🌐 5,416 Tracks Now on IPFS!" \
  "We've completed our migration to decentralized storage! All audio is now stored on IPFS via Pinata. New uploads go directly to IPFS - no more centralized streaming. Your music, truly decentralized." \
  "FEATURE_UPDATE" \
  "https://soundchain.io/dex" \
  '["ipfs", "decentralized", "pinata", "web3"]'

# Announcement 3: IPFS-Only Minting
post_announcement \
  "🎵 New Mints Now 100% IPFS!" \
  "All new tracks uploaded to SoundChain are now stored directly on IPFS. No more Mux streaming - pure decentralized audio. Lower costs, permanent storage, Web3-native." \
  "FEATURE_UPDATE" \
  "https://soundchain.io/upload" \
  '["minting", "ipfs", "decentralized", "upload"]'

# Announcement 4: SCid Certificates
post_announcement \
  "📜 SCid Certificates for Non-Web3 Artists!" \
  "Upload your music without a wallet! Get your SCid certificate - proof of registration on the Web3 music graph. Download your certificate, no database storage. Bandcamp/DistroKid style, Web3 powered." \
  "PRODUCT_LAUNCH" \
  "https://soundchain.io/upload" \
  '["scid", "certificates", "artists", "nocode"]'

# Announcement 5: CarPlay Support
post_announcement \
  "🚗 CarPlay Now Supported!" \
  "Listen to SoundChain in your car! CarPlay integration is now live with full metadata support - see track title, artist, and artwork on your car's display. Plus AirPlay and Bluetooth work perfectly too!" \
  "FEATURE_UPDATE" \
  "https://soundchain.io" \
  '["carplay", "mobile", "streaming", "apple"]'

# Announcement 6: Audio Normalization
post_announcement \
  "🔊 -24 LUFS Audio Normalization!" \
  "All playback now features professional broadcast-standard loudness normalization. No more volume jumping between tracks! Dynamics preserved - no compression, just consistent loudness." \
  "FEATURE_UPDATE" \
  "https://soundchain.io/dex" \
  '["audio", "mastering", "loudness", "professional"]'

# Announcement 7: Mobile Audio Fixed
post_announcement \
  "📱 Mobile Audio Playback Fixed!" \
  "Audio now plays perfectly on mobile Safari and all mobile browsers. We fixed the HLS vs IPFS detection issue - now handles both stream types seamlessly. Listen anywhere!" \
  "FEATURE_UPDATE" \
  "https://soundchain.io" \
  '["mobile", "ios", "android", "streaming"]'

echo "=================================="
echo "🎉 Announcement blast complete!"
echo ""
echo "View the feed: https://soundchain.io/announcements"
