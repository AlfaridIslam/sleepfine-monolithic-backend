import Warranty from '../../models/Warranty.js';
import logger from '../../../../utils/logger.js';

class WarrantyDbService {
  /**
   * Normalize input fields and persist warranty registration record to MongoDB
   * @param {Object} rawData - Incoming request body
   * @returns {Promise<Document>} Saved warranty document
   */
  async saveWarranty(rawData = {}) {
    try {
      const customerName = (rawData.customerName || rawData.name || rawData['Customer Name'] || '').trim();
      const mobileNumber = (rawData.mobileNumber || rawData.phone || rawData.number || rawData.customerPhone || rawData['Mobile Number'] || '').trim();
      const product = (rawData.selectedProduct || rawData.product || rawData['Product'] || 'SleepFine Orthopedic Mattress').trim();

      if (!customerName) {
        throw new Error('Customer name is required');
      }
      if (!mobileNumber) {
        throw new Error('Mobile number is required');
      }

      // Generate unique warranty number if not supplied
      const warrantyNumber = (rawData.warrantyNumber || rawData.orderNumber || rawData['Order Number'] ||
        `SF-W-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`).trim();

      const rawSizeType = String(rawData.sizeType || rawData['Size Type'] || 'standard').toLowerCase().trim();
      const sizeType = (rawSizeType === 'customized' || rawSizeType === 'custom') ? rawSizeType : 'standard';

      const normalizedData = {
        warrantyNumber,
        orderNumber: (rawData.orderNumber || rawData['Order Number'] || rawData.orderId || '').trim() || null,
        customerName,
        mobileNumber,
        email: (rawData.email || rawData['Email Id'] || rawData.customerEmail || '').trim().toLowerCase(),
        address: (rawData.address || rawData['Address'] || '').trim(),
        city: (rawData.city || rawData['City'] || '').trim(),
        state: (rawData.state || rawData['State'] || '').trim(),
        product,
        variety: (rawData.selectedVariety || rawData.variety || rawData['Variety'] || 'Standard Collection').trim(),
        sizeType,
        length: String(rawData.length || rawData['Length'] || '').trim(),
        breadth: String(rawData.breadth || rawData['Breadth'] || '').trim(),
        height: String(rawData.height || rawData['Height'] || '').trim(),
        customLength: String(rawData.customLength || '').trim(),
        customBreadth: String(rawData.customBreadth || '').trim(),
        customHeight: String(rawData.customHeight || '').trim(),
        totalQuantity: String(rawData.totalQuantity || rawData['Total Quantity'] || '1').trim(),
        purchaseFrom: (rawData.purchaseFrom || rawData['Purchase From'] || 'Direct').trim(),
        selectedStore: (rawData.selectedStore || rawData.store || rawData.Store || '').trim(),
        dealerName: (rawData.dealerName || rawData.dealer || rawData['Dealer Name'] || '').trim(),
        invoiceDate: rawData.invoiceDate || rawData['Invoice Date'] || rawData.purchaseDate || new Date().toLocaleDateString('en-IN'),
        warrantyPeriod: (rawData.warrantyPeriod || rawData.warranty || rawData['Warranty'] || '5 Years Comprehensive').trim(),
        rawFormData: rawData,
      };

      const warrantyRecord = new Warranty(normalizedData);
      const savedRecord = await warrantyRecord.save();

      logger.info(`Warranty record successfully saved to MongoDB: ${savedRecord.warrantyNumber} (ID: ${savedRecord._id})`);
      return savedRecord;
    } catch (error) {
      logger.error('Failed to save warranty record to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Update sync status asynchronously for audit & retry tracking
   * @param {string|ObjectId} warrantyId 
   * @param {Object} statusUpdates - Fields to update (e.g. syncStatus.googleSheet)
   */
  async updateSyncStatus(warrantyId, statusUpdates = {}) {
    try {
      await Warranty.findByIdAndUpdate(warrantyId, { $set: statusUpdates }, { new: true });
    } catch (error) {
      logger.warn(`Failed to update syncStatus for warranty ${warrantyId}:`, error.message);
    }
  }
}

export default new WarrantyDbService();
