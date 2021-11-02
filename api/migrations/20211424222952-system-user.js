module.exports = {
  async up(db) {
    const profile = await db.collection('profiles').insertOne({
      _id: undefined,
      displayName: '_system',
      socialMedias: {},
      favoriteGenres: [],
      musicianTypes: [],
    });

    await db.collection('users').insertOne({
      _id: undefined,
      profileId: profile.insertedId.toString(),
      handle: '_system',
      email: 'system@soundchain.com',
    });
  },
};
