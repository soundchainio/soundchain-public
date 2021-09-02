module.export = {
  async up(db) {
    //await db.collection('profiles').updateMany({}, { $set: { favoriteArtists: [] } });
  },

  async down(db) {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};
