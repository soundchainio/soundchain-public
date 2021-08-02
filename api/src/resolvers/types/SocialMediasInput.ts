import { Matches } from 'class-validator';
import { Field, InputType } from 'type-graphql';

@InputType()
export class SocialMediasInput {
  @Field()
  @Matches(/[A-z0-9_\-.]?/, { message: 'Invalid characters' })
  facebook: string;

  @Field()
  @Matches(/[A-z0-9_\-.]?/, { message: 'Invalid characters' })
  instagram: string;

  @Field()
  @Matches(/[A-z0-9_\-.]?/, { message: 'Invalid characters' })
  soundcloud: string;

  @Field()
  @Matches(/[A-z0-9_\-.]?/, { message: 'Invalid characters' })
  twitter: string;
}
