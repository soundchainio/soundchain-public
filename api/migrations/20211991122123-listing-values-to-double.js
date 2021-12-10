const Double = require('mongodb').Double;

module.exports = {
  async up(db) {
    const bids = db.collection('bids');
    const bidsCursor = await bids.find({ amount: { $exists: true } });
    await bidsCursor.forEach(async bid => {
      await bids.updateOne({ _id: bid._id }, { $set: { amount: new Double(bid.amount) } });
    });

    const auctionitems = db.collection('auctionitems');
    let auctionCursor = await auctionitems.find({ reservePrice: { $exists: true } });
    await auctionCursor.forEach(async item => {
      await auctionitems.updateOne({ _id: item._id }, { $set: { reservePrice: new Double(item.reservePrice) } });
    });

    auctionCursor = await auctionitems.find({ highestBid: { $exists: true } });
    await auctionCursor.forEach(async item => {
      await auctionitems.updateOne({ _id: item._id }, { $set: { highestBid: new Double(item.highestBid) } });
    });

    const buynowitems = db.collection('buynowitems');
    const buynowCursor = await buynowitems.find();
    await buynowCursor.forEach(async item => {
      await buynowitems.updateOne({ _id: item._id }, { $set: { pricePerItem: new Double(item.pricePerItem) } });
    });
  },
};
