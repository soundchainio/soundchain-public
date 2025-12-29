/**
 * Migration: Check specific track artwork
 */

module.exports = {
  async up(db) {
    console.log('=== CHECKING SPECIFIC TRACKS ===');

    const tracks = db.collection('tracks');

    // Check tracks with "TERRORIST" in title
    const terroristTracks = await tracks.find({
      title: { $regex: /terrorist/i }
    }).toArray();

    console.log('Found tracks matching TERRORIST:', terroristTracks.length);

    terroristTracks.forEach(t => {
      console.log('---');
      console.log('ID:', t._id.toString());
      console.log('Title:', t.title);
      console.log('artworkUrl:', t.artworkUrl || 'NULL/EMPTY');
      console.log('nftData.ipfsCid:', t.nftData?.ipfsCid || 'NULL');
    });

    // Also check a few random tracks without artwork
    const noArtwork = await tracks.find({
      $or: [
        { artworkUrl: null },
        { artworkUrl: '' },
        { artworkUrl: { $exists: false } }
      ]
    }).limit(5).toArray();

    console.log('\\n=== TRACKS WITHOUT ARTWORK ===');
    console.log('Count:', noArtwork.length);
    noArtwork.forEach(t => {
      console.log('- ID:', t._id.toString(), 'Title:', t.title);
    });

    console.log('=== CHECK COMPLETE ===');
  },

  async down() {
    console.log('Check migration - nothing to roll back');
  }
};
