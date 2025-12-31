/**
 * Diagnostic migration: Find accounts associated with homieyay.eth@gmail.com
 * and the homie_yay_yay profile to understand the login issue.
 *
 * This is READ-ONLY - just queries to understand the data.
 */

module.exports = {
  async up(db) {
    console.log('🔍 === DIAGNOSING ACCOUNT: homie_yay_yay ===\n');

    // 1. Find all users with the email homieyay.eth@gmail.com
    console.log('📧 Looking for users with email: homieyay.eth@gmail.com');
    const usersWithEmail = await db.collection('users').find({
      email: { $regex: /homieyay/i }
    }).toArray();

    console.log(`Found ${usersWithEmail.length} user(s) with that email:\n`);
    for (const user of usersWithEmail) {
      console.log('--- USER RECORD ---');
      console.log('  User ID:', user._id.toString());
      console.log('  Email:', user.email);
      console.log('  Handle:', user.handle);
      console.log('  Profile ID:', user.profileId?.toString());
      console.log('  Auth Method:', user.authMethod);
      console.log('  Magic Wallet:', user.magicWalletAddress);
      console.log('  Google Wallet:', user.googleWalletAddress);
      console.log('  Email Wallet:', user.emailWalletAddress);
      console.log('  Created:', user.createdAt);
      console.log('');
    }

    // 2. Find the profile with handle homie_yay_yay
    console.log('\n👤 Looking for profile with userHandle: homie_yay_yay');
    const homieProfile = await db.collection('profiles').findOne({
      $or: [
        { userHandle: 'homie_yay_yay' },
        { userHandle: { $regex: /homie.*yay/i } },
        { displayName: { $regex: /homie/i } }
      ]
    });

    if (homieProfile) {
      console.log('--- HOMIE PROFILE ---');
      console.log('  Profile ID:', homieProfile._id.toString());
      console.log('  Display Name:', homieProfile.displayName);
      console.log('  User Handle:', homieProfile.userHandle);
      console.log('  Bio:', homieProfile.bio);
      console.log('  Followers:', homieProfile.followerCount);
      console.log('  Magic Wallet:', homieProfile.magicWalletAddress);
      console.log('  Created:', homieProfile.createdAt);

      // Find the user record that links to this profile
      console.log('\n🔗 Finding user record linked to this profile...');
      const linkedUser = await db.collection('users').findOne({
        profileId: homieProfile._id
      });

      if (linkedUser) {
        console.log('--- LINKED USER ---');
        console.log('  User ID:', linkedUser._id.toString());
        console.log('  Email:', linkedUser.email);
        console.log('  Handle:', linkedUser.handle);
        console.log('  Auth Method:', linkedUser.authMethod);
        console.log('  Created:', linkedUser.createdAt);
      } else {
        console.log('⚠️ No user record found linking to homie_yay_yay profile!');
      }
    } else {
      console.log('❌ No profile found with homie_yay_yay handle');
    }

    // 3. Find Rick Deckard profile
    console.log('\n👤 Looking for Rick Deckard profile...');
    const rickProfile = await db.collection('profiles').findOne({
      $or: [
        { displayName: { $regex: /rick.*deckard/i } },
        { displayName: 'Rick Deckard' }
      ]
    });

    if (rickProfile) {
      console.log('--- RICK DECKARD PROFILE ---');
      console.log('  Profile ID:', rickProfile._id.toString());
      console.log('  Display Name:', rickProfile.displayName);
      console.log('  User Handle:', rickProfile.userHandle);
      console.log('  Created:', rickProfile.createdAt);

      // Find user linked to Rick
      const rickUser = await db.collection('users').findOne({
        profileId: rickProfile._id
      });

      if (rickUser) {
        console.log('--- RICK\'s USER ---');
        console.log('  User ID:', rickUser._id.toString());
        console.log('  Email:', rickUser.email);
        console.log('  Auth Method:', rickUser.authMethod);
      }
    }

    console.log('\n✅ Diagnosis complete!');
    console.log('\n📋 SUMMARY: Check if homie_yay_yay profile is linked to a different email/auth method than homieyay.eth@gmail.com');
  },

  async down() {
    // Read-only - nothing to undo
  }
};
