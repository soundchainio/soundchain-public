/**
 * Fix homie_yay_yay account: Update homieyay.eth@gmail.com user to point to correct profile
 *
 * ISSUE: homieyay.eth@gmail.com user is linked to Rick Deckard profile instead of homie_yay_yay
 *
 * BEFORE:
 * - User 66b5bd84553eec0008c5dbec (homieyay.eth@gmail.com) -> Profile 66b5bd83553eec0008c5dbb8 (Rick Deckard)
 * - Profile 61f09cbb6dce7c00096faa5e (homie_yay_yay) -> User 61f09cbb6dce7c00096faa68 (different)
 *
 * AFTER:
 * - User 66b5bd84553eec0008c5dbec (homieyay.eth@gmail.com) -> Profile 61f09cbb6dce7c00096faa5e (homie_yay_yay)
 */

const { ObjectId } = require('mongodb');

module.exports = {
  async up(db) {
    const homieProfileId = new ObjectId('61f09cbb6dce7c00096faa5e');
    const homieyayUserId = new ObjectId('66b5bd84553eec0008c5dbec');
    const rickProfileId = new ObjectId('66b5bd83553eec0008c5dbb8');

    console.log('=== FIXING homie_yay_yay ACCOUNT ===');

    // 1. Verify current state
    const user = await db.collection('users').findOne({ _id: homieyayUserId });
    console.log('User before update:', {
      id: user?._id?.toString(),
      email: user?.email,
      currentProfileId: user?.profileId?.toString()
    });

    if (!user) {
      console.log('ERROR: User not found!');
      return;
    }

    // 2. Verify homie_yay_yay profile exists
    const homieProfile = await db.collection('profiles').findOne({ _id: homieProfileId });
    console.log('Target profile:', {
      id: homieProfile?._id?.toString(),
      displayName: homieProfile?.displayName,
      userHandle: homieProfile?.userHandle
    });

    if (!homieProfile) {
      console.log('ERROR: homie_yay_yay profile not found!');
      return;
    }

    // 3. Update the user's profileId to point to homie_yay_yay
    const result = await db.collection('users').updateOne(
      { _id: homieyayUserId },
      {
        $set: {
          profileId: homieProfileId,
          updatedAt: new Date()
        }
      }
    );

    console.log('Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount
    });

    // 4. Verify the update worked
    const updatedUser = await db.collection('users').findOne({ _id: homieyayUserId });
    console.log('User after update:', {
      email: updatedUser?.email,
      newProfileId: updatedUser?.profileId?.toString()
    });

    console.log('SUCCESS: homieyay.eth@gmail.com now linked to homie_yay_yay profile!');
    console.log('=== FIX COMPLETE ===');
  },

  async down(db) {
    // Restore original link to Rick Deckard (for rollback)
    const homieyayUserId = new ObjectId('66b5bd84553eec0008c5dbec');
    const rickProfileId = new ObjectId('66b5bd83553eec0008c5dbb8');

    await db.collection('users').updateOne(
      { _id: homieyayUserId },
      {
        $set: {
          profileId: rickProfileId,
          updatedAt: new Date()
        }
      }
    );

    console.log('Rolled back: homieyay.eth@gmail.com linked back to Rick Deckard profile');
  }
};
