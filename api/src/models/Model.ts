import { modelOptions } from '@typegoose/typegoose';
import { Base } from '@typegoose/typegoose/lib/defaultClasses';

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
export class Model extends Base<string> {}
