import Faker from 'faker';
import { random, range, sample } from 'lodash';
import { Comment, CommentModel } from 'models/Comment';
import { Post, PostModel } from 'models/Post';
import { Profile, ProfileModel } from 'models/Profile';
import User, { UserModel } from 'models/User';
import mongoose from 'mongoose';

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

  const profiles: Profile[] = [];
  const users: User[] = [];
  const posts: Post[] = [];
  const comments: Comment[] = [];

  for (let i = 0; i < 100; i++) {
    const profile = FakeProfile();
    profiles.push(profile);
    users.push(FakeUser({ profileId: profile._id }));
  }

  await ProfileModel.insertMany(profiles);
  await UserModel.insertMany(users);

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

  console.log('Success!');

  process.exit(0);
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

async function dropDb() {
  const conn = await mongoose.createConnection(DATABASE_URL, dbOpts);
  return conn.dropDatabase();
}

seedDb();
