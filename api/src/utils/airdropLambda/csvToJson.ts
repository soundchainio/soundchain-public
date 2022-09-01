import path from "path";
import { tokenHoldersFileName, whitelistFileName } from "./config.json";
import csv from 'csvtojson/v2';

const whitelistCsvPath = path.join(__dirname, `../${whitelistFileName}`);
const audiusHoldersCsvPath = path.join(__dirname, `../${tokenHoldersFileName}`);

class CsvToJson {
    private whitelistCsvPath: string;
    private audiusHoldersCsvPath: string;

    constructor() {
        this.whitelistCsvPath = whitelistCsvPath;
        this.audiusHoldersCsvPath = audiusHoldersCsvPath;
    }

    async getWhitelistJson () {
        try {
            const whitelistUsers = await csv().fromFile( this.whitelistCsvPath);

            return whitelistUsers;
        } catch (error) {
            console.error(error)
        }
    }

    async getAudiusHoldersJson () {
        try {
            const audiusHolders = await csv().fromFile(this.audiusHoldersCsvPath);

            return audiusHolders;
        } catch (error) {
            console.error(error)
        }
    }
}


export default new CsvToJson();