module.exports = {
  async up(db) {
    await db.collection('notifications').deleteMany({});
    await db.collection('profiles').updateMany({}, { $set: { unreadNotificationCount: 0 } });
  },
};
