module.exports = {
  async up(db) {
    await db.collection('tracks').createIndex({});
    await db.collection('profiles').createIndex({ displayName: "text" });
  },
};
