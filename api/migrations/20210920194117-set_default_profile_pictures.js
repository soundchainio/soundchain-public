const _ = require('lodash');

module.exports = {
  async up(db) {
    const cursor = await db.collection('profiles').find();
    await cursor.forEach(async ({ _id }) => {
      await db.collection('profiles').updateOne(
        { _id },
        {
          $set: {
            defaulProfilePicture: randomDefaultProfilePicture(),
            defaultCoverPicture: randomDefaultCoverPicture(),
          },
        },
      );
    });
  },

  async down(db) {
    await db.collection('profiles').updateMany({}, { $unset: { defaultProfilePicture: '', defaultCoverPicture: '' } });
  },
};

function randomDefaultProfilePicture() {
  return _.sample(Object.values(['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink']));
}

function randomDefaultCoverPicture() {
  return _.sample(Object.values(['birds', 'cells', 'fog', 'net', 'rings', 'waves']));
}
