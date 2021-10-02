module.exports = {
  async up(db) {
    const tracks = db.collection('tracks');
    const cursor = await tracks.find({
      audioUrl: { $exists: true },
    });
    await cursor.forEach(async track => {
      await tracks.updateOne({ _id: track._id }, { $set: { file: track.audioUrl }, $unset: { audioUrl: '' } });
    });
    await tracks.deleteMany({ audioUrl: { $exists: true } });
  },

  async down(db) {
    const tracks = db.collection('tracks');
    const cursor = await tracks.find({ file: { $exists: true } });
    await cursor.forEach(async track => {
      await tracks.updateOne({ _id: track._id }, { $set: { audioUrl: track.file }, $unset: { file: '' } });
    });
  },
};
