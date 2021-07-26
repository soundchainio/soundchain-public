import Faker from 'faker';
import mongoose from 'mongoose';
import { ProfileModel } from './models/Profile';
import { UserModel } from './models/User';

const { DATABASE_URL = 'mongodb://localhost:27017' } = process.env;
const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

async function seedDb() {
  await dropDb();
  await mongoose.connect(DATABASE_URL, dbOpts);

  console.log('Seeding db...');

  console.log('Seeding user profiles...');

  const profiles = [];
  const users = [];

  for (let i = 0; i < 100; i++) {
    const profile = FakeProfile();
    profiles.push(profile);
    users.push(FakeUser({ profileId: profile.id }));
  }

  await ProfileModel.insertMany(profiles);
  await UserModel.insertMany(users);

  console.log('User profiles seeded!');

  console.log('Success!');

  process.exit(0);
}

function FakeProfile(attrs = {}) {
  return new ProfileModel({
    displayName: Faker.name.findName(),
    profilePicture: Faker.internet.avatar(),
    coverPicture: Faker.image.abstract(),
    socialMediaLinks: [
      { name: 'twitter', link: `https://twitter.com/${Faker.internet.userName()}` },
      { name: 'instagram', link: `https://instagram.com/${Faker.internet.userName()}` },
      { name: 'facebook', link: `https://facebook.com/${Faker.internet.userName()}` },
    ],
    ...attrs,
  });
}

function FakeUser(attrs = {}) {
  return new UserModel({
    email: Faker.internet.email(),
    handle: Faker.internet.userName(),
    password: Faker.internet.password(),
    ...attrs,
  });
}

async function dropDb() {
  const conn = await mongoose.createConnection(DATABASE_URL, dbOpts);
  return conn.dropDatabase();
}

seedDb();
