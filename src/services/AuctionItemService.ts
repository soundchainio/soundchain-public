import { AuctionItemModel } from '../models/AuctionItem';
import { ObjectId } from 'mongodb';

export class AuctionItemService {
  /**
   * Get Auction Item by ID
   * @param itemId - ID of the Auction Item
   */
  async getAuctionItemById(itemId: string) {
    const auctionItem = await AuctionItemModel.findById(new ObjectId(itemId)); // Ensure ObjectId compatibility

    if (!auctionItem) {
      throw new Error('Auction item not found');
    }

    return auctionItem;
  }

  /**
   * Process Auction Item
   * @param itemId - ID of the Auction Item
   */
  async processAuctionItem(itemId: string) {
    const auctionItem = await this.getAuctionItemById(itemId);

    // Ensure logic uses the correct property
    if (auctionItem.isPaymentOGUN) {
      console.log('Processing OGUN payment for auction item:', itemId);
    } else {
      console.log('Processing other payment method for auction item:', itemId);
    }
  }

  /**
   * Create a new Auction Item
   * @param data - Auction Item data
   */
  async createAuctionItem(data: any) {
    const auctionItem = new AuctionItemModel({
      ...data,
      _id: new ObjectId(data._id), // Ensure compatibility with ObjectId
    });

    await auctionItem.save();
    return auctionItem;
  }

  /**
   * Delete an Auction Item
   * @param itemId - ID of the Auction Item to delete
   */
  async deleteAuctionItem(itemId: string) {
    const auctionItem = await AuctionItemModel.findByIdAndDelete(new ObjectId(itemId)); // Handle ObjectId

    if (!auctionItem) {
      throw new Error('Auction item not found or already deleted');
    }

    console.log('Deleted auction item:', itemId);
    return auctionItem;
  }
}