import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { SocialMediaName } from '../../models/SocialMedia';
import { SocialMediaInputType } from '../../resolvers/types/SocialMediaInputType';

const socialMediaRegex = {
  [SocialMediaName.TWITTER]: /(?:https?:)?\/\/(?:www\.)?twitter\.com\/@?(?!home|share|privacy|tos)([A-z0-9_]+)\/?/,
  [SocialMediaName.FACEBOOK]:
    /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/((?![A-z]+\.php)(?!marketplace|gaming|watch|me|messages|help|search|groups)[A-z0-9_\-.]+)\/?/,
  [SocialMediaName.INSTAGRAM]:
    /(?:https?:)?\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)/,
};

export const IsSocialMediaLink = (validationOptions?: ValidationOptions) => {
  return (socialMedia: SocialMediaInputType, propertyName: string): void => {
    registerDecorator({
      name: 'IsSocialMediaLink',
      target: socialMedia.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          return new RegExp(socialMediaRegex[(args.object as SocialMediaInputType).name]).test(value as string);
        },
      },
    });
  };
};
