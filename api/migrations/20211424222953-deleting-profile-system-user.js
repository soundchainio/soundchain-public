const { Role } = require('../src/types/Role');

module.exports = {
  async up(db) {
    await db
      .collection('users')
      .updateOne({ handle: '_system' }, { $set: { profileId: undefined, roles: [Role.SYSTEM] } });

    await db.collection('profiles').deleteOne({ displayName: '_system' });
  },
};
