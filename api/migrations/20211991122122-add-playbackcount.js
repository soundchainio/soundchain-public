module.exports = {
  async up(db) {
    await db.collection('tracks').updateMany({ playbackCount: { $exists: false } }, { $set: { playbackCount: 0 } });
  },
};
