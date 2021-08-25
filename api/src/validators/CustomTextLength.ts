import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import GraphemeSplitter from 'grapheme-splitter';
const splitter = new GraphemeSplitter();

@ValidatorConstraint({ name: 'CustomTextLength', async: false })
export class CustomTextLength implements ValidatorConstraintInterface {
  validate(text: string) {
    return splitter.splitGraphemes(text).length <= 160;
  }

  defaultMessage() {
    return 'Text is too long!';
  }
}
