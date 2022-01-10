module.exports = {
  async up(db) {
    await db
      .collection('profiles')
      .update({ displayName: 'SoundChain', followerCount: { $exists: false } }, { $set: { followerCount: 0 } });

    await db
      .collection('profiles')
      .update({ displayName: 'SoundChain', followingCount: { $exists: false } }, { $set: { followingCount: 0 } });

    await db
      .collection('profiles')
      .update(
        { displayName: 'SoundChain', unreadNotificationCount: { $exists: false } },
        { $set: { unreadNotificationCount: 0 } },
      );

    await db
      .collection('profiles')
      .update(
        { displayName: 'SoundChain', unreadMessageCount: { $exists: false } },
        { $set: { unreadMessageCount: 0 } },
      );

    await db
      .collection('profiles')
      .update({ displayName: 'SoundChain', verified: { $exists: false } }, { $set: { verified: true } });
  },
};
