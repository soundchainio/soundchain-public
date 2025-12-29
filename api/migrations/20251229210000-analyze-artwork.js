/**
 * Migration: Analyze artwork URLs
 * Check what artwork URLs look like and identify broken ones
 */

module.exports = {
  async up(db) {
    console.log('=== ANALYZING ARTWORK URLs ===');

    const tracks = db.collection('tracks');

    // Get total tracks
    const total = await tracks.countDocuments();
    console.log('Total tracks:', total);

    // Count tracks with artworkUrl
    const withArtwork = await tracks.countDocuments({ artworkUrl: { $exists: true, $ne: null, $ne: '' } });
    console.log('Tracks with artworkUrl:', withArtwork);

    // Sample different types of artwork URLs
    const samples = await tracks.aggregate([
      { $match: { artworkUrl: { $exists: true, $ne: null, $ne: '' } } },
      { $limit: 100 },
      { $project: { artworkUrl: 1, title: 1 } }
    ]).toArray();

    // Categorize URLs
    const categories = {
      ipfsIo: [],
      pinataGateway: [],
      s3: [],
      cloudinary: [],
      other: []
    };

    samples.forEach(t => {
      const url = t.artworkUrl;
      if (url.includes('ipfs.io')) categories.ipfsIo.push(url);
      else if (url.includes('pinata')) categories.pinataGateway.push(url);
      else if (url.includes('s3.amazonaws') || url.includes('cloudfront')) categories.s3.push(url);
      else if (url.includes('cloudinary')) categories.cloudinary.push(url);
      else categories.other.push(url);
    });

    console.log('\\n--- URL Categories (from 100 samples) ---');
    console.log('ipfs.io gateway:', categories.ipfsIo.length);
    console.log('Pinata gateway:', categories.pinataGateway.length);
    console.log('S3/CloudFront:', categories.s3.length);
    console.log('Cloudinary:', categories.cloudinary.length);
    console.log('Other:', categories.other.length);

    // Show sample of each
    if (categories.ipfsIo.length > 0) {
      console.log('\\nSample ipfs.io URL:', categories.ipfsIo[0]);
    }
    if (categories.pinataGateway.length > 0) {
      console.log('Sample Pinata URL:', categories.pinataGateway[0]);
    }
    if (categories.s3.length > 0) {
      console.log('Sample S3 URL:', categories.s3[0]);
    }
    if (categories.other.length > 0) {
      console.log('Sample Other URLs:', categories.other.slice(0, 3));
    }

    // Check NFT data
    const withNftIpfs = await tracks.countDocuments({ 'nftData.ipfsCid': { $exists: true, $ne: null } });
    console.log('\\nTracks with NFT IPFS CID:', withNftIpfs);

    console.log('=== ANALYSIS COMPLETE ===');
  },

  async down() {
    console.log('Analysis migration - nothing to roll back');
  }
};
