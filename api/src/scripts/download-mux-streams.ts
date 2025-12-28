/**
 * Download Mux HLS Streams to Local MP4
 *
 * This script downloads audio from Mux HLS streams and saves as MP4 locally.
 * Uses ffmpeg to convert HLS streams to MP4 files.
 *
 * Prerequisites:
 * - ffmpeg installed (brew install ffmpeg)
 * - mux_exported directory with metadata.json files from export-mux-assets.ts
 *
 * Usage: npx ts-node src/scripts/download-mux-streams.ts [options]
 *
 * Options:
 *   --limit=N     Only process N tracks
 *   --skip=N      Skip first N tracks
 *   --track=ID    Download specific track by ID
 *   --parallel=N  Number of parallel downloads (default: 3)
 */

import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

dotenv.config({ path: '.env.local' });

const execAsync = promisify(exec);

const EXPORT_DIR = path.join(__dirname, '..', '..', '..', 'mux_exported');

interface TrackMetadata {
  trackId: string;
  title: string;
  artist: string;
  muxAssetId: string;
  playbackId: string;
  hlsUrl: string;
  mp4Url?: string;
  duration: number;
  exportedAt: string;
}

interface DownloadResult {
  trackId: string;
  title: string;
  status: 'success' | 'skipped' | 'error';
  filePath?: string;
  fileSize?: number;
  error?: string;
}

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const options: any = { parallel: 3 };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--skip=')) options.skip = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--track=')) options.trackId = arg.split('=')[1];
    else if (arg.startsWith('--parallel=')) options.parallel = parseInt(arg.split('=')[1], 10);
  }

  return options;
}

// Check if ffmpeg is installed
async function checkFfmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

// Download HLS stream to MP4
async function downloadStream(hlsUrl: string, outputPath: string, title: string): Promise<void> {
  // ffmpeg command to download HLS and save as MP4
  // -y: overwrite output
  // -i: input URL
  // -c copy: copy streams without re-encoding (faster)
  // -bsf:a aac_adtstoasc: fix AAC bitstream for MP4 container
  const cmd = `ffmpeg -y -i "${hlsUrl}" -c copy -bsf:a aac_adtstoasc "${outputPath}" 2>&1`;

  console.log(`    ⬇️  Downloading: ${title}`);

  try {
    await execAsync(cmd, { timeout: 300000 }); // 5 min timeout
  } catch (error: any) {
    // ffmpeg sometimes returns non-zero but still succeeds
    if (!fs.existsSync(outputPath)) {
      throw new Error(error.message || 'ffmpeg failed');
    }
  }
}

// Process tracks in batches
async function processBatch(tracks: { folder: string; metadata: TrackMetadata }[], batchSize: number): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    const batchPromises = batch.map(async ({ folder, metadata }) => {
      const result: DownloadResult = {
        trackId: metadata.trackId,
        title: metadata.title || 'Untitled',
        status: 'error',
      };

      const outputPath = path.join(folder, 'audio.mp4');

      // Skip if already downloaded
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) { // At least 1KB
          result.status = 'skipped';
          result.filePath = outputPath;
          result.fileSize = stats.size;
          result.error = 'Already downloaded';
          return result;
        }
      }

      // Need HLS URL
      if (!metadata.hlsUrl) {
        result.status = 'error';
        result.error = 'No HLS URL';
        return result;
      }

      try {
        await downloadStream(metadata.hlsUrl, outputPath, metadata.title);

        const stats = fs.statSync(outputPath);
        result.status = 'success';
        result.filePath = outputPath;
        result.fileSize = stats.size;
      } catch (err: any) {
        result.status = 'error';
        result.error = err.message;
      }

      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress update
    const completed = Math.min(i + batchSize, tracks.length);
    const success = results.filter(r => r.status === 'success').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'error').length;
    console.log(`\n📊 Progress: ${completed}/${tracks.length} | ✅ ${success} | ⏭️ ${skipped} | ❌ ${failed}\n`);
  }

  return results;
}

async function main() {
  const options = parseArgs();

  console.log('🎵 Mux HLS Stream Downloader');
  console.log('============================\n');

  // Check ffmpeg
  console.log('🔍 Checking ffmpeg...');
  if (!await checkFfmpeg()) {
    console.error('❌ ffmpeg not found! Install with: brew install ffmpeg');
    process.exit(1);
  }
  console.log('✅ ffmpeg available\n');

  // Check export directory
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Export directory not found: ${EXPORT_DIR}`);
    process.exit(1);
  }

  // Get all track folders
  let trackFolders = fs.readdirSync(EXPORT_DIR)
    .filter(f => {
      const stat = fs.statSync(path.join(EXPORT_DIR, f));
      return stat.isDirectory() && f !== '_orphans' && !f.startsWith('.');
    });

  console.log(`📁 Found ${trackFolders.length} track folders\n`);

  // Filter by specific track
  if (options.trackId) {
    trackFolders = trackFolders.filter(f => f === options.trackId);
    if (trackFolders.length === 0) {
      console.error(`❌ Track not found: ${options.trackId}`);
      process.exit(1);
    }
  }

  // Apply skip/limit
  if (options.skip) trackFolders = trackFolders.slice(options.skip);
  if (options.limit) trackFolders = trackFolders.slice(0, options.limit);

  console.log(`📋 Processing ${trackFolders.length} tracks (parallel: ${options.parallel})\n`);

  // Load metadata for all tracks
  const tracks: { folder: string; metadata: TrackMetadata }[] = [];

  for (const trackId of trackFolders) {
    const folder = path.join(EXPORT_DIR, trackId);
    const metadataPath = path.join(folder, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.log(`⚠️  No metadata: ${trackId}`);
      continue;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      tracks.push({ folder, metadata });
    } catch {
      console.log(`⚠️  Invalid metadata: ${trackId}`);
    }
  }

  console.log(`📋 ${tracks.length} tracks with valid metadata\n`);

  // Process in parallel batches
  const startTime = Date.now();
  const results = await processBatch(tracks, options.parallel);

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const success = results.filter(r => r.status === 'success').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'error').length;
  const totalSize = results
    .filter(r => r.fileSize)
    .reduce((sum, r) => sum + (r.fileSize || 0), 0);

  // Save report
  const reportPath = path.join(EXPORT_DIR, `download_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    startTime: new Date(startTime).toISOString(),
    duration: `${duration} minutes`,
    total: results.length,
    success,
    skipped,
    failed,
    totalSizeBytes: totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
    results: results.filter(r => r.status === 'error'),
  }, null, 2));

  console.log('============================');
  console.log('📊 Download Complete!');
  console.log(`   Total: ${results.length}`);
  console.log(`   Downloaded: ${success}`);
  console.log(`   Already Had: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Duration: ${duration} minutes`);
  console.log(`   Report: ${reportPath}`);
  console.log('============================\n');

  if (failed > 0) {
    console.log('❌ Failed tracks saved to report. Re-run to retry.\n');
  }
}

main().catch(console.error);
