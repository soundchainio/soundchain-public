// Role enum value inlined to avoid build path issues in Lambda
const ROLE_SYSTEM = 'SYSTEM';

module.exports = {
  async up(db) {
    await db
      .collection('users')
      .updateOne({ handle: '_system' }, { $set: { profileId: undefined, roles: [ROLE_SYSTEM] } });

    await db.collection('profiles').deleteOne({ displayName: '_system' });
  },
};
