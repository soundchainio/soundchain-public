import Faker from 'faker';
import { random, range, sample, sampleSize } from 'lodash';
import mongoose from 'mongoose';
import { Comment, CommentModel } from '../models/Comment';
import { Follow, FollowModel } from '../models/Follow';
import { Post, PostModel } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { User, UserModel } from '../models/User';

const { DATABASE_URL = 'mongodb://localhost:27017' } = process.env;
const dbOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

const profiles: Profile[] = [];
const users: User[] = [];
const posts: Post[] = [];
const comments: Comment[] = [];
const follows: Follow[] = [];

async function seedDb() {
  await dropDb();
  await mongoose.connect(DATABASE_URL, dbOpts);

  console.log('Seeding db...');

  console.log('Seeding user profiles...');

  for (let i = 0; i < 100; i++) {
    const profile = FakeProfile();
    profiles.push(profile);
    users.push(FakeUser({ profileId: profile._id }));
  }

  for (const profile of profiles) {
    const followedId = profile._id;
    const numFollowers = random(0, 100);
    sampleSize(profiles, numFollowers).forEach(profile => {
      profile.followingCount++;
      follows.push(new FollowModel({ followedId, followerId: profile._id }));
    });
    profile.followerCount = numFollowers;
  }

  await ProfileModel.insertMany(profiles);
  await UserModel.insertMany(users);
  await FollowModel.insertMany(follows);

  console.log('User profiles seeded!');

  for (let i = 0; i < 100; i++) {
    const profile = sample(profiles);
    const post = FakePost({ profileId: profile?._id });
    posts.push(post);
    range(0, random(0, 5)).forEach(() => {
      const profile = sample(profiles);
      comments.push(FakeComment({ postId: post.id, profileId: profile?._id }));
    });
  }

  await PostModel.insertMany(posts);
  await CommentModel.insertMany(comments);

  console.log('Posts + comments seeded!');

  await seedMason();

  console.log('Developers seeded!');

  console.log('Success!');

  process.exit(0);
}

async function dropDb() {
  const conn = await mongoose.createConnection(DATABASE_URL, dbOpts);
  return conn.dropDatabase();
}

function FakeProfile(attrs = {}) {
  return new ProfileModel({
    displayName: Faker.name.findName(),
    profilePicture: Faker.internet.avatar(),
    coverPicture: Faker.image.abstract(),
    socialMedias: {
      twitter: Faker.internet.userName(),
      facebook: Faker.internet.userName(),
      instagram: Faker.internet.userName(),
      soundcloud: Faker.internet.userName(),
    },
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

function FakePost(attrs = {}) {
  return new PostModel({
    body: Faker.lorem.paragraph(),
    ...attrs,
  });
}

function FakeComment(attrs = {}) {
  return new CommentModel({
    body: Faker.lorem.paragraph(),
    ...attrs,
  });
}

async function seedMason() {
  const mason = FakeProfile({ displayName: 'Mason Seale' });
  await mason.save();
  const user = FakeUser({
    email: 'mason.seale@ae.studio',
    handle: 'masonseale',
    password: 'SEED_PASSWORD_REDACTED',
    profileId: mason.id,
  });
  await user.save();

  const follows = sampleSize(profiles, 50).map(
    profile => new FollowModel({ followerId: mason.id, followedId: profile._id }),
  );

  FollowModel.insertMany(follows);
}

seedDb();
