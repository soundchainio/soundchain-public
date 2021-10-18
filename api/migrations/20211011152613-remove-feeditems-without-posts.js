module.exports = {
  async up(db) {
    const idsToBeRemoved = [];

    const posts = db.collection('posts');
    const feeditems = db.collection('feeditems');

    const postsIdsObjId = await posts.distinct('_id');
    const feeditemsPostIds = await feeditems.distinct('postId');

    const postsIds = postsIdsObjId.map(item => {
      return item.toString();
    });

    await feeditemsPostIds.map(id => {
      if (!postsIds.includes(id)) {
        idsToBeRemoved.push(id);
      }
    });

    await feeditems.deleteMany({ postId: { $in: idsToBeRemoved } });
  },
};
