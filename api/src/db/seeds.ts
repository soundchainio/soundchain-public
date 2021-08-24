import Faker from 'faker';
import { random, range, sample, sampleSize } from 'lodash';
import mongoose from 'mongoose';
import { Comment, CommentModel } from '../models/Comment';
import { Follow, FollowModel } from '../models/Follow';
import { Post, PostModel } from '../models/Post';
import { Profile, ProfileModel } from '../models/Profile';
import { Reaction, ReactionModel } from '../models/Reaction';
import { User, UserModel } from '../models/User';

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
  const follows: Follow[] = [];
  const reactions: Reaction[] = [];

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

    range(0, random(0, 5)).forEach(() => {
      const profile = sample(profiles);
      comments.push(FakeComment({ postId: post.id, profileId: profile?._id }));
    });

    range(0, random(0, 20)).forEach(() => {
      const profile = sample(profiles);
      const reaction = FakeReaction({ postId: post.id, profileId: profile?._id });

      reactions.push(reaction);

      const stats = post.reactionStats.find(stats => stats.emoji === reaction.emoji);
      if (stats) {
        post.reactionStats = post.reactionStats.map(stats =>
          stats.emoji === reaction.emoji ? { emoji: reaction.emoji, count: stats.count + 1 } : stats,
        );
      } else {
        post.reactionStats = [...post.reactionStats, { emoji: reaction.emoji, count: 1 }];
      }
    });

    posts.push(post);
  }

  await PostModel.insertMany(posts);
  await CommentModel.insertMany(comments);
  await ReactionModel.insertMany(reactions);

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

function FakeReaction(attrs = {}) {
  const emojiOptions = ['❤️', '🤘', '😃', '😢', '😎'];

  return new ReactionModel({
    emoji: sample(emojiOptions),
    ...attrs,
  });
}

async function dropDb() {
  const conn = await mongoose.createConnection(DATABASE_URL, dbOpts);
  return conn.dropDatabase();
}

seedDb();
