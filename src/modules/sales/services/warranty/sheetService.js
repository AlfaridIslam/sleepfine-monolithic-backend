import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

class WarrantySheetService {
  constructor() {
    this.appsScriptUrl = config.googleSheets?.warrantyWebhookUrl ||
      process.env.GOOGLE_SHEETS_WARRANTY_URL ||
      '';
  }

  /**
   * Push warranty data to Google Sheet via Google Apps Script Web App
   * @param {Object} warrantyRecord - Mongoose warranty document / plain object
   * @returns {Promise<{ status: string, message?: string }>}
   */
  async syncToGoogleSheet(warrantyRecord = {}) {
    const warrantyNumber = warrantyRecord.warrantyNumber || 'UNKNOWN';

    try {
      logger.info(`Initiating Google Sheet sync for warranty: ${warrantyNumber}`);

      const sizeDimension = (warrantyRecord.sizeType === 'custom' || warrantyRecord.sizeType === 'customized')
        ? `${warrantyRecord.customLength || ''} x ${warrantyRecord.customBreadth || ''} x ${warrantyRecord.customHeight || ''}`.trim()
        : `${warrantyRecord.length || ''} x ${warrantyRecord.breadth || ''} x ${warrantyRecord.height || ''}`.trim();

      const nowTimestamp = new Date().toISOString();

      // Primary payload strictly aligned with the exact 21 Google Sheet column headers:
      // ["ID", "Invoice Date", "Customer Name", "Mobile Number", "Email Id", "Address", "State", "City", 
      //  "Product", "Variety", "Length", "Breadth", "Height", "Purchase From", "Store", "Dealer Name", 
      //  "Order Number", "Total Quantity", "Warranty", "CREATED AT", "UPDATED AT"]
      const payload = {
        'ID': warrantyRecord.warrantyNumber || (warrantyRecord._id ? String(warrantyRecord._id) : ''),
        'Invoice Date': warrantyRecord.invoiceDate || '',
        'Customer Name': warrantyRecord.customerName || '',
        'Mobile Number': warrantyRecord.mobileNumber || '',
        'Email Id': warrantyRecord.email || '',
        'Address': warrantyRecord.address || '',
        'State': warrantyRecord.state || '',
        'City': warrantyRecord.city || '',
        'Product': warrantyRecord.product || '',
        'Variety': warrantyRecord.variety || '',
        'Length': warrantyRecord.length || warrantyRecord.customLength || '',
        'Breadth': warrantyRecord.breadth || warrantyRecord.customBreadth || '',
        'Height': warrantyRecord.height || warrantyRecord.customHeight || '',
        'Purchase From': warrantyRecord.purchaseFrom || '',
        'Store': warrantyRecord.selectedStore || '',
        'Dealer Name': warrantyRecord.dealerName || '',
        'Order Number': warrantyRecord.orderNumber || '',
        'Total Quantity': String(warrantyRecord.totalQuantity || '1'),
        'Warranty': warrantyRecord.warrantyPeriod || '',
        'CREATED AT': nowTimestamp,
        'UPDATED AT': nowTimestamp,

        // Dual key aliases for backwards-compatibility with Google Apps Script implementations
        customerName: warrantyRecord.customerName,
        mobileNumber: warrantyRecord.mobileNumber,
        email: warrantyRecord.email || '',
        address: warrantyRecord.address || '',
        city: warrantyRecord.city || '',
        state: warrantyRecord.state || '',
        product: warrantyRecord.product,
        variety: warrantyRecord.variety || '',
        sizeType: warrantyRecord.sizeType || 'standard',
        length: warrantyRecord.length || warrantyRecord.customLength || '',
        breadth: warrantyRecord.breadth || warrantyRecord.customBreadth || '',
        height: warrantyRecord.height || warrantyRecord.customHeight || '',
        purchaseFrom: warrantyRecord.purchaseFrom || '',
        selectedStore: warrantyRecord.selectedStore || '',
        dealerName: warrantyRecord.dealerName || '',
        totalQuantity: String(warrantyRecord.totalQuantity || '1'),
        orderNumber: warrantyRecord.orderNumber || '',
        invoiceDate: warrantyRecord.invoiceDate || '',
        warrantyPeriod: warrantyRecord.warrantyPeriod || '',
        warrantyNumber: warrantyRecord.warrantyNumber,
      };

      // Dispatch directly and exclusively to GOOGLE_SHEETS_WARRANTY_URL (appsScriptUrl)
      const targetUrl = this.appsScriptUrl || config.googleSheets?.warrantyWebhookUrl || process.env.GOOGLE_SHEETS_WARRANTY_URL;

      if (!targetUrl) {
        throw new Error('Google Sheets warranty webhook URL is not configured');
      }

      await this._postToTarget(targetUrl, payload);
      logger.info(`Google Sheet synced successfully via Apps Script webhook for warranty: ${warrantyNumber}`);
      return { status: 'success', target: 'primary' };
    } catch (error) {
      logger.error(`Google Sheet sync failed for warranty ${warrantyNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Helper to POST payload to a webhook target with timeout
   */
  async _postToTarget(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${response.statusText})`);
    }

    return response;
  }
}

export default new WarrantySheetService();
