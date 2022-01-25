const Web3 = require('web3');

module.exports = {
  async up(db) {
    const bids = db.collection('bids');
    const bidsCursor = await bids.find({ amount: { $exists: true } });
    await bidsCursor.forEach(async bid => {
      const amountToShow = getPriceToShow(bid.amount);
      await bids.updateOne({ _id: bid._id }, { $set: { amount: bid.amount.toString(), amountToShow } });
    });

    const auctionitems = db.collection('auctionitems');
    let auctionCursor = await auctionitems.find({ reservePrice: { $exists: true } });
    await auctionCursor.forEach(async item => {
      const reservePriceToShow = getPriceToShow(item.reservePrice);
      await auctionitems.updateOne(
        { _id: item._id },
        { $set: { reservePrice: item.reservePrice.toString(), reservePriceToShow } },
      );
    });

    auctionCursor = await auctionitems.find({ highestBid: { $exists: true } });
    await auctionCursor.forEach(async item => {
      const highestBidToShow = getPriceToShow(item.highestBid);
      await auctionitems.updateOne(
        { _id: item._id },
        { $set: { highestBid: item.highestBid.toString(), highestBidToShow } },
      );
    });

    const buynowitems = db.collection('buynowitems');
    const buynowCursor = await buynowitems.find();
    await buynowCursor.forEach(async item => {
      const pricePerItemToShow = getPriceToShow(item.pricePerItem);
      await buynowitems.updateOne(
        { _id: item._id },
        { $set: { pricePerItem: item.pricePerItem.toString(), pricePerItemToShow } },
      );
    });

    await db.collection('notifications').deleteMany({});
    await db.collection('profiles').updateMany({}, { $set: { unreadNotificationCount: 0 } });
  },
};

const getPriceToShow = wei =>
  fixedDecimals(Web3.utils.fromWei(wei.toLocaleString('fullwide', { useGrouping: false }), 'ether'));

const fixedDecimals = value => {
  const s = value.toString();
  if (!s || isNaN(parseFloat(s))) {
    return 0;
  }
  const [integerPart, decimals] = s.split('.');
  const n = parseFloat(s);

  if (decimals?.length > 6) {
    return parseFloat(n.toPrecision(Math.min(integerPart.length + 3, 21)));
  }

  return n;
};
