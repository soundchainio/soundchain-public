const ObjectId = require('mongodb').ObjectId;

// Role enum values inlined to avoid build path issues in Lambda
const ROLE_SOUNDCHAIN_ACCOUNT = 'SOUNDCHAIN_ACCOUNT';
const ROLE_ADMIN = 'ADMIN';
const ROLE_TEAM_MEMBER = 'TEAM_MEMBER';

module.exports = {
  async up(db) {
    const profile = await db.collection('profiles').insertOne({
      _id: undefined,
      profilePicture: '/default-pictures/profile/purple.png',
      coverPicture: '/default-pictures/cover/waves.jpeg',
      socialMedias: {},
      favoriteGenres: [],
      musicianTypes: [],
      followerCount: 0,
      followingCount: 0,
      unreadNotificationCount: 0,
      unreadMessageCount: 0,
      verified: true,
      displayName: 'SoundChain',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('users').insertOne({
      _id: undefined,
      roles: [ROLE_SOUNDCHAIN_ACCOUNT, ROLE_ADMIN, ROLE_TEAM_MEMBER],
      email: 'admin@soundchain.io',
      handle: 'soundchain',
      profileId: new ObjectId(profile.insertedId.toString()),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },
};
