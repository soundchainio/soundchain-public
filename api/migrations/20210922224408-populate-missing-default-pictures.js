const _ = require('lodash');

module.exports = {
  async up(db) {
    const profiles = db.collection('profiles');
    const missingProfilePicture = await profiles.find({
      $or: [{ profilePicture: { $exists: false } }, { profilePicture: null }, { profilePicture: '' }],
    });

    await missingProfilePicture.forEach(async profile => {
      await profiles.updateOne({ _id: profile._id }, { $set: { profilePicture: randomDefaultProfilePicture() } });
    });

    const missingCoverPicture = await profiles.find({
      $or: [{ coverPicture: { $exists: false } }, { coverPicture: null }, { coverPicture: '' }],
    });

    await missingCoverPicture.forEach(async profile => {
      await profiles.updateOne({ _id: profile._id }, { $set: { coverPicture: randomDefaultCoverPicture() } });
    });
  },

  async down(db) {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};

function randomDefaultProfilePicture() {
  return _.sample([
    '/default-pictures/profile/red.png',
    '/default-pictures/profile/orange.png',
    '/default-pictures/profile/yellow.png',
    '/default-pictures/profile/green.png',
    '/default-pictures/profile/teal.png',
    '/default-pictures/profile/blue.png',
    '/default-pictures/profile/purple.png',
    '/default-pictures/profile/pink.png',
  ]);
}

function randomDefaultCoverPicture() {
  return _.sample([
    '/default-pictures/cover/birds.jpeg',
    '/default-pictures/cover/cells.jpeg',
    '/default-pictures/cover/fog.jpeg',
    '/default-pictures/cover/net.jpeg',
    '/default-pictures/cover/rings.jpeg',
    '/default-pictures/cover/waves.jpeg',
  ]);
}
