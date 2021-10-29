module.exports = {
  async up(db) {
    await db.collection('blockTracker').insertOne({
      _id: undefined,
      blockNumber: 20797781,
    });
  },
};
