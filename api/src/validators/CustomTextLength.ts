import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import GraphemeSplitter from 'grapheme-splitter';

const splitter = new GraphemeSplitter();
const TEXT_LIMIT = 160;

@ValidatorConstraint({ name: 'CustomTextLength', async: false })
export class CustomTextLength implements ValidatorConstraintInterface {
  validate(text: string): boolean {
    return splitter.splitGraphemes(text).length <= TEXT_LIMIT;
  }

  defaultMessage(): string {
    return 'Text is too long!';
  }
}
