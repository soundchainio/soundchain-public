module.exports = {
  async up(db) {
    await db.collection('feeditems').deleteMany();

    const profiles = await db.collection('profiles').find().toArray();
    const profileIds = profiles.map(profile => profile._id);
    const seedPosts = await db.collection('posts').find().sort({ createdAt: -1 }).limit(50).toArray();
    const feedItems = profileIds
      .map(profileId => {
        return seedPosts.map(post => ({
          profileId: profileId.toString(),
          postId: post._id.toString(),
          postedAt: post.createdAt,
        }));
      })
      .reduce((acc, items) => acc.concat(items), []);
    await db.collection('feeditems').insertMany(feedItems);
  },

  async down(db) {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};
