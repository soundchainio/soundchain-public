import path from "path";
import { tokenHoldersFileName, whitelistFileName } from "../config.json";
import csv from 'csvtojson/v2';
import fs from "fs";

const whitelistCsvPath = path.join(__dirname, `../${whitelistFileName}`);
const audiusHoldersCsvPath = path.join(__dirname, `../${tokenHoldersFileName}`);

const audiusHoldersJson = path.join(__dirname, "../output/audiusHolders.json");
const whitelistJson = path.join(__dirname, "../output/whitelist.json");
class CsvToJson {
    private whitelistCsvPath: string;
    private audiusHoldersCsvPath: string;

    constructor() {
        this.whitelistCsvPath = whitelistCsvPath;
        this.audiusHoldersCsvPath = audiusHoldersCsvPath;
    }

    async getWhitelistJson () {
        try {
            const whitelistUsers = await csv().fromFile(this.whitelistCsvPath);
 
            fs.writeFileSync(whitelistJson, JSON.stringify(whitelistUsers))

            return whitelistUsers;
        } catch (error) {
            console.error(error)
        }
    }

    async getAudiusHoldersJson () {
        try {
            const audiusHolders = await csv().fromFile(this.audiusHoldersCsvPath);

            fs.writeFileSync(audiusHoldersJson, JSON.stringify(audiusHolders))

            return audiusHolders;
        } catch (error) {
            console.error(error)
        }
    }
}


export default new CsvToJson();