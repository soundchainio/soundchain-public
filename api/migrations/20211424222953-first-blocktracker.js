module.exports = {
  async up(db) {
    await db.collection('blocktrackers').insertOne({
      _id: undefined,
      blockNumber: 24153543,
    });
  },
};
