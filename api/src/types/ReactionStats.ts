import { prop } from '@typegoose/typegoose';
import { ReactionType } from './ReactionType';

export class ReactionStats {
  @prop({ required: true, default: 0 })
  [ReactionType.HAPPY]: number;

  @prop({ required: true, default: 0 })
  [ReactionType.HEART]: number;

  @prop({ required: true, default: 0 })
  [ReactionType.HORNS]: number;

  @prop({ required: true, default: 0 })
  [ReactionType.SAD]: number;

  @prop({ required: true, default: 0 })
  [ReactionType.SUNGLASSES]: number;
}
