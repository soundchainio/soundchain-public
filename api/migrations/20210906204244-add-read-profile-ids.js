module.exports = {
  async up(db) {
    await db.collection('messages').updateMany({}, { $set: { readProfileIds: [] } });
  },

  async down(db) {
    await db.collection('messages').updateMany({}, { $unset: { readProfileIds: '' } });
  },
};
