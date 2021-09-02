module.exports = {
  async up(db) {
    await db
      .collection('feeditems')
      .updateMany({}, [{ $set: { postId: { $toString: '$postId' }, profileId: { $toString: '$profileId' } } }]);
  },

  async down(db) {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};
