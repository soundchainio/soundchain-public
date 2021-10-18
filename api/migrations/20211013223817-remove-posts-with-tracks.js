module.exports = {
  async up(db) {
    await db.collection('posts').deleteMany({ trackId: { $exists: true } });

    const orphanFeedItems = await db
      .collection('feeditems')
      .aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: 'postId',
            foreignField: '_id',
            as: 'posts',
          },
        },
        {
          $match: {
            posts: [],
          },
        },
        {
          $project: {
            _id: '$_id',
          },
        },
      ])
      .toArray();

    await db.collection('feeditems').deleteMany({
      _id: { $in: orphanFeedItems.map(({ _id }) => _id) },
    });
  },
};
