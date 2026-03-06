import { registerEnumType } from 'type-graphql';

enum PostFormTypes {
  NEW_POST = 'New post',
  REPOST = 'Repost',
  EDIT_POST = 'Edit post',
}

registerEnumType(PostFormTypes, {
  name: 'PostFormTypes',
});

export { PostFormTypes };
