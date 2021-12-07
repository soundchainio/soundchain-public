module.exports = {
  async up(db) {
    db.createCollection('listingitemviews', {
      viewOn: 'auctionitems',
      pipeline: [
        {
          $match: {
            valid: true,
          },
        },
        {
          $unionWith: {
            coll: 'buynowitems',
            pipeline: [
              {
                $match: {
                  valid: true,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'tracks',
            localField: 'tokenId',
            foreignField: 'nftData.tokenId',
            as: 'track',
          },
        },
        {
          $unwind: {
            path: '$track',
          },
        },
      ],
    });
  },
};
