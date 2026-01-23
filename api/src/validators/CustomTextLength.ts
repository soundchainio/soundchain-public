import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import GraphemeSplitter from 'grapheme-splitter';

const splitter = new GraphemeSplitter();
const TEXT_LIMIT = 1000; // Match web client limit

// Regex to match emote markdown: ![emote:name](url)
const emoteMarkdownRegex = /!\[emote:[^\]]+\]\([^)]+\)/g;

// Count each emote as 1 character instead of full markdown length
const getCharacterCount = (text: string): number => {
  const emoteMatches = text.match(emoteMarkdownRegex) || [];
  const textWithoutEmotes = text.replace(emoteMarkdownRegex, '');
  return splitter.splitGraphemes(textWithoutEmotes).length + emoteMatches.length;
};

@ValidatorConstraint({ name: 'CustomTextLength', async: false })
export class CustomTextLength implements ValidatorConstraintInterface {
  validate(text: string): boolean {
    return getCharacterCount(text) <= TEXT_LIMIT;
  }

  defaultMessage(): string {
    return 'Text is too long!';
  }
}
