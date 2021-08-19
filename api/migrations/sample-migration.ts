/* eslint-disable @typescript-eslint/no-unused-vars */
import { Db } from 'mongodb';

export = {
  async up(db: Db): Promise<void> {
    //await db.collection('profiles').updateMany({}, { $set: { favoriteArtists: [] } });
  },

  async down(db: Db): Promise<void> {
    //await db.collection('profiles').updateMany({}, { $unset: { favoriteArtists: '' } });
  },
};
