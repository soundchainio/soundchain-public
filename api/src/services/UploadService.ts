import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Context } from '../types/Context';
import { UploadUrl } from '../types/UploadUrl';

const TEN_MINUTES = 1000 * 60 * 10;

export class UploadService {
  s3Client: S3Client;

  constructor(private context: Context) {
    this.s3Client = new S3Client({ region: config.uploads.region });
  }

  async generateUploadUrl(fileType: string, fileExtension: string): Promise<UploadUrl> {
    const imageId = uuidv4();
    const fileName = `${imageId}.${fileExtension}`;
    const bucketParams: PutObjectCommandInput = {
      Bucket: config.uploads.bucket,
      Key: fileName,
      ContentType: fileType,
      ACL: 'public-read',
    };
    const command = new PutObjectCommand(bucketParams);
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: TEN_MINUTES,
    });
    return {
      uploadUrl,
      fileName,
      readUrl: `https://${config.uploads.bucket}.s3.${config.uploads.region}.amazonaws.com/${fileName}`,
    };
  }
}
