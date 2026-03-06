/**
 * Setup Co-Founder Roles Script
 *
 * This script updates the roles for SoundChain co-founders to grant them:
 * - ADMIN role: Full admin access (verify users, manage content, etc.)
 * - TEAM_MEMBER role: Shows gold SoundChain logo badge on profile
 *
 * Usage:
 * MONGODB_URI="mongodb://..." npx ts-node src/scripts/setup-cofounders.ts
 */

import mongoose from 'mongoose';
import { UserModel } from '../models/User';
import { Role } from '../types/Role';

// Co-founder handles
const COFOUNDER_HANDLES = ['JSan619', 'Titomag', 'furdA1'];

async function setupCofounders() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  for (const handle of COFOUNDER_HANDLES) {
    console.log(`\nProcessing co-founder: ${handle}`);

    // Find user by handle (case-insensitive)
    const user = await UserModel.findOne({
      handle: { $regex: new RegExp(`^${handle}$`, 'i') }
    });

    if (!user) {
      console.log(`  ⚠️  User not found: ${handle}`);
      continue;
    }

    console.log(`  Found user: ${user.handle} (${user.email})`);
    console.log(`  Current roles: ${user.roles.join(', ')}`);

    // Check if already has admin and team member roles
    const hasAdmin = user.roles.includes(Role.ADMIN);
    const hasTeamMember = user.roles.includes(Role.TEAM_MEMBER);

    if (hasAdmin && hasTeamMember) {
      console.log(`  ✅ Already has ADMIN and TEAM_MEMBER roles`);
      continue;
    }

    // Update roles to include ADMIN and TEAM_MEMBER
    const newRoles = [...new Set([...user.roles, Role.ADMIN, Role.TEAM_MEMBER])];

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { roles: newRoles } }
    );

    console.log(`  ✅ Updated roles: ${newRoles.join(', ')}`);
  }

  console.log('\n✅ Co-founder setup complete');

  // Verify the changes
  console.log('\n--- Verification ---');
  for (const handle of COFOUNDER_HANDLES) {
    const user = await UserModel.findOne({
      handle: { $regex: new RegExp(`^${handle}$`, 'i') }
    });
    if (user) {
      const hasAdmin = user.roles.includes(Role.ADMIN);
      const hasTeamMember = user.roles.includes(Role.TEAM_MEMBER);
      console.log(`${user.handle}:`);
      console.log(`  - Admin access: ${hasAdmin ? '✅' : '❌'}`);
      console.log(`  - Gold badge (Team Member): ${hasTeamMember ? '✅' : '❌'}`);
      console.log(`  - Roles: [${user.roles.join(', ')}]`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

setupCofounders().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
