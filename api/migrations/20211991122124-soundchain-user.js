const ObjectId = require('mongodb').ObjectId;
const { Role } = require('../src/types/Role');

module.exports = {
  async up(db) {
    const profile = await db.collection('profiles').insertOne({
      _id: undefined,
      profilePicture: '/default-pictures/profile/purple.png',
      coverPicture: '/default-pictures/cover/waves.jpeg',
      socialMedias: {},
      favoriteGenres: [],
      musicianTypes: [],
      displayName: 'SoundChain',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('users').insertOne({
      _id: undefined,
      roles: [Role.SOUNDCHAIN_ACCOUNT, Role.ADMIN, Role.TEAM_MEMBER],
      email: 'admin@soundchain.io',
      handle: 'soundchain',
      profileId: new ObjectId(profile.insertedId.toString()),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  },
};
