import { modelOptions, ReturnModelType } from '@typegoose/typegoose';
import { Base } from '@typegoose/typegoose/lib/defaultClasses';
import NotFoundError from '../errors/NotFoundError';

@modelOptions({
  schemaOptions: {
    timestamps: true,
  },
})
export default class Model extends Base<string> {
  static async findByIdOrFail<T extends typeof Model>(this: ReturnModelType<T>, id: string): Promise<InstanceType<T>> {
    const entity = await this.findById(id);

    if (!entity) {
      throw new NotFoundError(this.modelName, id);
    }

    return entity;
  }
}
