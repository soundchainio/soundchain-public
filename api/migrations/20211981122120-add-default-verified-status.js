module.exports = {
  async up(db) {
    await db.collection('profiles').updateMany({}, { $set: { verified: false } });
  },
};
