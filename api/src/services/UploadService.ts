import { PutObjectCommand, PutObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { Context } from '../types/Context';
import { UploadFileType } from '../types/UploadFileType';
import { UploadUrl } from '../types/UploadUrl';

const FIVE_MINUTES = 1000 * 60 * 5;

export class UploadService {
  s3Client: S3Client;

  constructor(private context: Context) {
    this.s3Client = new S3Client({ region: config.uploads.region });
  }

  async generateUploadUrl(fileType: UploadFileType): Promise<UploadUrl> {
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
