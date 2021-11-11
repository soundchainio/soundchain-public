const ObjectId = require('mongodb').ObjectId;

module.exports = {
  async up(db) {
    const comments = db.collection('comments');
    let cursor = await comments.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await comments.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const feeditems = db.collection('feeditems');
    cursor = await feeditems.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await feeditems.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const mintingrequests = db.collection('mintingrequests');
    cursor = await mintingrequests.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await mintingrequests.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const notifications = db.collection('notifications');
    cursor = await notifications.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await notifications.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const posts = db.collection('posts');
    cursor = await posts.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await posts.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const profiles = db.collection('profiles');
    cursor = await profiles.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await profiles.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const profileverificationrequests = db.collection('profileverificationrequests');
    cursor = await profileverificationrequests.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await profileverificationrequests.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const reactions = db.collection('reactions');
    cursor = await reactions.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await reactions.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const subscriptions = db.collection('subscriptions');
    cursor = await subscriptions.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await subscriptions.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const tracks = db.collection('tracks');
    cursor = await tracks.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await tracks.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const postservice = db.collection('postservice');
    cursor = await postservice.find({ profileId: { $exists: true } });
    await cursor.forEach(async i => {
      await postservice.updateOne({ _id: i._id }, { $set: { profileId: new ObjectId(i.profileId) } });
    });

    const messages = db.collection('messages');
    cursor = await messages.find();
    await cursor.forEach(async i => {
      await messages.updateOne(
        { _id: i._id },
        { $set: { toId: new ObjectId(i.toId), fromId: new ObjectId(i.fromId) } },
      );
    });
  },
};
