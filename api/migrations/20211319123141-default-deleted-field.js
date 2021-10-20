module.exports = {
  async up(db) {
    await db.collection('tracks').updateMany({}, { $set: { deleted: false } });
    await db.collection('comments').updateMany({}, { $set: { deleted: false } });
    await db.collection('posts').updateMany({}, { $set: { deleted: false } });
  },
};
