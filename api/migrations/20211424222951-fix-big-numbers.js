module.exports = {
  async up(db) {
    const listingItems = db.collection('listingitems');
    // prettier-ignore
    const cursor = await listingItems.find({ pricePerItem: 1e+22 });
    await cursor.forEach(async listingItem => {
      await listingItems.updateOne({ _id: listingItem._id }, { $set: { pricePerItem: '10000000000000000000000' } });
    });
  },
};
