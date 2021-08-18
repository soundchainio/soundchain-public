import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from 'config';
import { AcceptedProfileImageFileTypes } from 'enums/AcceptedImageFileTypes';
import { UploadUrl } from 'resolvers/types/UploadUrl';
import { v4 as uuidv4 } from 'uuid';

const FIVE_MINUTES = 1000 * 60 * 5;

export class UploadService {
  static s3Client: S3Client;

  static initialize(): void {
    this.s3Client = new S3Client({ region: config.uploads.region });
  }

  static async generateUploadUrl(fileType: AcceptedProfileImageFileTypes): Promise<UploadUrl> {
    const imageId = uuidv4();
    const extension = fileType.split('/')[1];
    const fileName = `${imageId}.${extension}`;
    const bucketParams: PutObjectCommandInput = {
      Bucket: config.uploads.bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
    };
    const command = new PutObjectCommand(bucketParams);
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: FIVE_MINUTES,
    });
    return {
      uploadUrl,
      fileName,
      readUrl: `https://${config.uploads.bucket}.s3.${config.uploads.region}.amazonaws.com/${fileName}`,
    };
  }
}
