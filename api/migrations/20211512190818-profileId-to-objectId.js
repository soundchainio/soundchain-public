const ObjectId = require('mongodb').ObjectId;

module.exports = {
  async up(db) {
    const users = db.collection('users');
    // prettier-ignore
    const cursor = await users.find({ profileId: { $exists: true } });
    await cursor.forEach(async user => {
      await users.updateOne({ _id: user._id }, { $set: { profileId: new ObjectId(user.profileId) } });
    });
  },
};
