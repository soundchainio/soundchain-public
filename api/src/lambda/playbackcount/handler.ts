import { mongoose } from '@typegoose/typegoose';
import type { Handler } from 'aws-lambda';
import { UserModel } from '../../models/User';
import muxDataApi from '../../muxDataApi';
import { Context } from '../../types/Context';
import { MuxDataInputValue, MuxServerData } from '../../types/MuxData';

export const playbackCount: Handler = async () => {
  const intervalGapInMinutes = 60 * 24; // 24 hours
  const nowTimestampInSeconds = Math.round(Date.now() / 1000);
  const initialTimestampInSeconds = nowTimestampInSeconds - intervalGapInMinutes * 60;

  // Use DATABASE_URL from serverless.yml environment variables
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  await mongoose.connect(dbUrl, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    tls: true,
    tlsCAFile: 'global-bundle.pem',
    retryWrites: false,
  });

  const user = await UserModel.findOne({ handle: '_system' });
  const context = new Context({ sub: user._id.toString() });

  let url: string;
  const fetch = async (pageSize: number, currentPage: number): Promise<MuxDataInputValue> => {
    try {
      url = `/metrics/unique_viewers/breakdown?group_by=video_id&limit=${pageSize}&page=${currentPage}&timeframe[]=${initialTimestampInSeconds}&timeframe[]=${nowTimestampInSeconds}&order_by=field&order_direction=asc`;
      const { data } = await muxDataApi.get<MuxServerData>(url);

      const values = data.data.map(video => ({ trackId: video.field, amount: video.views }));
      return { totalCount: data.total_row_count, values };
    } catch (error) {
      console.error(error);
      context.logErrorService.createLogError(
        'Lambda function: playbackCount - Error fetching Mux Data',
        `URL: ${url} Error: ${error}`,
      );
    }
  };

  const update = async (inputValue: MuxDataInputValue, url: string): Promise<number> => {
    try {
      return await context.trackService.incrementPlaybackCount(inputValue.values);
    } catch (error) {
      console.error(error);
      context.logErrorService.createLogError(
        'Lambda function: playbackCount - Error updating track',
        `URL: ${url} Error: ${error}`,
      );
    }
  };

  try {
    console.log('Starting');

    let currentPage = 1;
    const pageSize = 10000;

    const inputValues = await fetch(pageSize, currentPage);

    const totalCount = inputValues.totalCount;
    const totalPages = Math.ceil(totalCount / pageSize);

    if (!totalCount) {
      console.log(`${totalCount} tracks fetched`);
      return;
    }

    console.log(`Page size: ${pageSize} - Mux data fetched: ${totalCount} tracks to be updated...`);
    const tracksUpdated = await update(inputValues, url);

    console.log(
      `Page: ${currentPage}/${totalPages} - Tracks on page: ${inputValues.values.length} - Tracks updated: ${tracksUpdated}`,
    );

    if (totalPages > currentPage) {
      for (currentPage = 2; currentPage <= totalPages; currentPage++) {
        const inputValues = await fetch(pageSize, currentPage);
        const tracksUpdated = await update(inputValues, url);
        console.log(
          `Page: ${currentPage}/${totalPages} - Tracks on page: ${inputValues.values.length} - Tracks updated: ${tracksUpdated}`,
        );
      }
    }
  } catch (e) {
    console.error('Execution error, please check AWS logs', e);
    process.exit(1);
  } finally {
    console.log('Finished');
  }
};
