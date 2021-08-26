import { prop } from '@typegoose/typegoose';
import { ReactionType } from './ReactionType';

export class ReactionStats {
  @prop({ required: false })
  [ReactionType.HAPPY]?: number;

  @prop({ required: false })
  [ReactionType.HEART]?: number;

  @prop({ required: false })
  [ReactionType.HORNS]?: number;

  @prop({ required: false })
  [ReactionType.SAD]?: number;

  @prop({ required: false })
  [ReactionType.SUNGLASSES]?: number;
}
