import { IsOptional, Validate } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { CustomTextLength } from '../validators/CustomTextLength';

@InputType()
export class CreatePostInput {
  @Field(() => String)
  @Validate(CustomTextLength, {
    message: 'Text is too long',
  })
  body: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  mediaLink?: string;

  // Original URL before conversion to embed format (for oEmbed thumbnail lookups)
  @Field(() => String, { nullable: true })
  @IsOptional()
  originalMediaLink?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  trackId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  trackEditionId?: string;

  // Ephemeral media upload fields (24h stories from phone library)
  @Field(() => String, { nullable: true })
  @IsOptional()
  uploadedMediaUrl?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  uploadedMediaType?: string; // 'image' | 'video' | 'audio'
}
