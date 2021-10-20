module.exports = {
  async up(db) {
    Promise.all([
      db.collection('tracks').updateMany({}, { $set: { deleted: false } }),
      db.collection('comments').updateMany({}, { $set: { deleted: false } }),
      db.collection('posts').updateMany({}, { $set: { deleted: false } })
    ]);
  },
};
