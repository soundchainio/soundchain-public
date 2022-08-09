import { ProofBookItem, ProofBookItemModel } from "../models/ProofBookItem";
import { Context } from "../types/Context";
import { ModelService } from "./ModelService";


export class ProofBookService extends ModelService<typeof ProofBookItem> {
    constructor(context: Context) {
        super(context, ProofBookItemModel);
    }

    async getUserProofBook(walletAddress: string): Promise<ProofBookItem> {
        const proofBook = await this.model.findOne({
            address: walletAddress
        });
        return proofBook;
    }

}