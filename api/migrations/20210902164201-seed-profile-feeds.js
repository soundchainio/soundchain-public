module.exports = {
  async up(db) {
    const profiles = await db.collection('profiles').find().toArray();
    const profileIds = profiles.map(profile => profile._id);
    const seedPosts = await db.collection('posts').find().sort({ createdAt: -1 }).limit(50).toArray();
    const feedItems = profileIds
      .map(profileId => {
        return seedPosts.map(post => ({ profileId, postId: post._id, postedAt: post.createdAt }));
      })
      .reduce((acc, items) => acc.concat(items), []);
    await db.collection('feeditems').insertMany(feedItems);
  },

  async down(db) {
    await db.collection('feeditems').deleteMany();
  },
};
