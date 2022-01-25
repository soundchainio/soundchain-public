module.exports = {
  async up(db) {
    await db.collection('tracks').deleteMany({ muxAsset: { $exists: false } });
  },
};
