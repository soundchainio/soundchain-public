/**
 * Mux Asset Export Script
 *
 * This script exports all Mux assets to local storage before account expiration.
 * It downloads original source files and creates a mapping for database migration.
 *
 * Usage: npx ts-node src/scripts/export-mux-assets.ts
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import Mux from '@mux/mux-node';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

// Production DocumentDB connection - password is URL encoded
// ALWAYS use production DB for export, ignore .env.local
const DB_USER = 'soundchainadmin';
const DB_PASS = encodeURIComponent('r.*[XQ8Y8p*FV0ffeP!tQal8EVC8');
const DB_HOST = 'localhost:27018';
const DB_NAME = 'test';
const MONGODB_URI = `mongodb://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?authSource=admin&tls=true&tlsAllowInvalidCertificates=true&directConnection=true`;

const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'mux_exported');

interface MuxAssetInfo {
  id: string;
  playbackId: string;
  trackId: string;
  title: string;
  artist: string;
  status: string;
  duration: number;
  sourceUrl?: string;
  hlsUrl: string;
  mp4Url?: string;
  exportedPath?: string;
  error?: string;
}

interface ExportReport {
  startTime: string;
  endTime?: string;
  totalAssets: number;
  successfulExports: number;
  failedExports: number;
  assets: MuxAssetInfo[];
}

interface TrackDoc {
  _id: mongoose.Types.ObjectId;
  title?: string;
  artist?: string;
  muxAsset?: {
    id?: string;
    playbackId?: string;
  };
  deleted?: boolean;
}

// Track schema for querying
const TrackSchema = new mongoose.Schema({
  title: String,
  artist: String,
  muxAsset: {
    id: String,
    playbackId: String,
  },
  deleted: Boolean,
}, { collection: 'tracks', strict: false });

const Track = mongoose.model('Track', TrackSchema);

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

async function exportMuxAssets() {
  console.log('🎵 SoundChain Mux Export Script');
  console.log('================================\n');

  // Validate credentials
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.error('❌ MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in .env.local');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const report: ExportReport = {
    startTime: new Date().toISOString(),
    totalAssets: 0,
    successfulExports: 0,
    failedExports: 0,
    assets: [],
  };

  try {
    // Initialize Mux client
    console.log('📡 Connecting to Mux API...');
    const mux = new Mux(MUX_TOKEN_ID, MUX_TOKEN_SECRET);

    // Connect to MongoDB
    console.log('🗄️  Connecting to MongoDB...');
    console.log('   URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    } as any);
    console.log('✅ Connected to MongoDB\n');

    // Get all tracks with Mux assets from database
    console.log('📋 Fetching tracks from database...');
    const tracks = await Track.find({
      'muxAsset.id': { $exists: true, $ne: null },
      deleted: { $ne: true },
    }).lean();

    console.log(`Found ${tracks.length} tracks with Mux assets\n`);
    report.totalAssets = tracks.length;

    // Also get all Mux assets directly from API (in case some aren't in DB)
    console.log('📡 Fetching all assets from Mux API...');
    let muxAssets: any[] = [];
    try {
      const assetsResponse = await mux.Video.Assets.list();
      muxAssets = assetsResponse.data || [];
      console.log(`Found ${muxAssets.length} assets in Mux account\n`);
    } catch (err: any) {
      console.warn('⚠️  Could not fetch Mux asset list:', err.message);
    }

    // Create a map of Mux asset IDs to their data
    const muxAssetMap = new Map<string, any>();
    for (const asset of muxAssets) {
      muxAssetMap.set(asset.id, asset);
    }

    // Process each track
    let processed = 0;
    for (const track of tracks) {
      processed++;
      const muxAssetId = track.muxAsset?.id;
      const playbackId = track.muxAsset?.playbackId;
      const trackId = (track._id as mongoose.Types.ObjectId).toString();

      console.log(`[${processed}/${tracks.length}] Processing: ${track.title || 'Untitled'}`);

      const assetInfo: MuxAssetInfo = {
        id: muxAssetId || 'unknown',
        playbackId: playbackId || 'unknown',
        trackId,
        title: track.title || 'Untitled',
        artist: track.artist || 'Unknown Artist',
        status: 'pending',
        duration: 0,
        hlsUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : '',
      };

      try {
        // Get asset details from Mux
        let muxAsset = muxAssetMap.get(muxAssetId);
        if (!muxAsset && muxAssetId) {
          try {
            muxAsset = await mux.Video.Assets.get(muxAssetId);
          } catch (e: any) {
            console.log(`  ⚠️  Could not fetch asset from Mux: ${e.message}`);
          }
        }

        if (muxAsset) {
          assetInfo.status = muxAsset.status || 'unknown';
          assetInfo.duration = muxAsset.duration || 0;

          // Check for static renditions (MP4 downloads)
          const mp4Rendition = muxAsset.static_renditions?.files?.find(
            (f: any) => f.name === 'high.mp4' || f.name === 'medium.mp4' || f.name === 'low.mp4'
          );

          if (mp4Rendition && playbackId) {
            assetInfo.mp4Url = `https://stream.mux.com/${playbackId}/${mp4Rendition.name}`;
          }

          // Check for master access (original file)
          if (muxAsset.master_access === 'temporary') {
            try {
              const masterUrl = await mux.Video.Assets.createPlaybackId(muxAssetId, {
                policy: 'public',
              });
              console.log(`  📎 Master access available`);
            } catch (e) {
              // Master access might not be available
            }
          }
        }

        // Create track folder
        const trackFolder = path.join(OUTPUT_DIR, trackId);
        if (!fs.existsSync(trackFolder)) {
          fs.mkdirSync(trackFolder, { recursive: true });
        }

        // Save metadata
        const metadataPath = path.join(trackFolder, 'metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
          trackId,
          title: track.title,
          artist: track.artist,
          muxAssetId,
          playbackId,
          hlsUrl: assetInfo.hlsUrl,
          mp4Url: assetInfo.mp4Url,
          duration: assetInfo.duration,
          exportedAt: new Date().toISOString(),
        }, null, 2));

        // Try to download MP4 if available
        if (assetInfo.mp4Url) {
          const mp4Path = path.join(trackFolder, 'audio.mp4');
          console.log(`  ⬇️  Downloading MP4...`);
          try {
            await downloadFile(assetInfo.mp4Url, mp4Path);
            assetInfo.exportedPath = mp4Path;
            console.log(`  ✅ Downloaded to ${mp4Path}`);
            report.successfulExports++;
          } catch (err: any) {
            console.log(`  ❌ MP4 download failed: ${err.message}`);
            assetInfo.error = err.message;
            report.failedExports++;
          }
        } else {
          // Save HLS playlist URL for later processing
          const hlsInfoPath = path.join(trackFolder, 'hls_info.txt');
          fs.writeFileSync(hlsInfoPath, `HLS URL: ${assetInfo.hlsUrl}\nNote: Use ffmpeg to download HLS stream if needed:\nffmpeg -i "${assetInfo.hlsUrl}" -c copy "${trackFolder}/audio.mp4"\n`);
          console.log(`  📝 Saved HLS info (no direct MP4 available)`);
          assetInfo.exportedPath = hlsInfoPath;
          report.successfulExports++;
        }

      } catch (err: any) {
        console.log(`  ❌ Error: ${err.message}`);
        assetInfo.error = err.message;
        report.failedExports++;
      }

      report.assets.push(assetInfo);
    }

    // Export any Mux assets not in database
    const dbAssetIds = new Set(tracks.map(t => t.muxAsset?.id).filter(Boolean));
    const orphanAssets = muxAssets.filter(a => !dbAssetIds.has(a.id));

    if (orphanAssets.length > 0) {
      console.log(`\n📦 Found ${orphanAssets.length} Mux assets not in database (orphans)`);

      for (const asset of orphanAssets) {
        const playbackId = asset.playback_ids?.[0]?.id;
        const assetFolder = path.join(OUTPUT_DIR, '_orphans', asset.id);

        if (!fs.existsSync(assetFolder)) {
          fs.mkdirSync(assetFolder, { recursive: true });
        }

        fs.writeFileSync(path.join(assetFolder, 'metadata.json'), JSON.stringify({
          muxAssetId: asset.id,
          playbackId,
          status: asset.status,
          duration: asset.duration,
          createdAt: asset.created_at,
          hlsUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
        }, null, 2));

        console.log(`  📝 Saved orphan asset: ${asset.id}`);
      }
    }

    report.endTime = new Date().toISOString();

    // Save final report
    const reportPath = path.join(OUTPUT_DIR, 'export_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n================================');
    console.log('📊 Export Complete!');
    console.log(`   Total Assets: ${report.totalAssets}`);
    console.log(`   Successful: ${report.successfulExports}`);
    console.log(`   Failed: ${report.failedExports}`);
    console.log(`   Report saved to: ${reportPath}`);
    console.log('================================\n');

  } catch (err: any) {
    console.error('❌ Fatal error:', err.message);
    report.endTime = new Date().toISOString();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'export_report.json'), JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

// Run the export
exportMuxAssets().catch(console.error);
