import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UserInputError } from 'apollo-server-express';
import { config } from 'config';
import { GenerateUploadUrlPayload } from 'resolvers/types/GenerateUploadUrlPayload';
import { v4 as uuidv4 } from 'uuid';

export class AWSService {
  static s3Client: S3Client;

  static initialize(): void {
    this.s3Client = new S3Client({ region: config.aws.region });
  }

  static async generateUploadUrl(fileType: string): Promise<GenerateUploadUrlPayload> {
    const imageId = uuidv4();
    const extension = fileType.split('/')[1];
    if (!extension) throw new UserInputError('Invalid file type');
    const fileName = `${imageId}.${extension}`;
    const bucketParams: PutObjectCommandInput = {
      Bucket: config.aws.bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
    };
    const command = new PutObjectCommand(bucketParams);
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 1000 * 60 * 5,
    });
    return {
      uploadUrl,
      fileName,
      readUrl: `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`,
    };
  }
}
