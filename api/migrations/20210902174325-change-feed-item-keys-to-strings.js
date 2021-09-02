module.exports = {
  async up(db) {
    await db
      .collection('feeditems')
      .update({}, [{ $set: { postId: { $toString: '$postId' }, profileId: { $toString: '$profileId' } } }], {
        multi: true,
      });
  },

  async down(db) {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};
