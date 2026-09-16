import config from '../../../../config/index.js';
import logger from '../../../../utils/logger.js';

class WarrantySheetService {
  constructor() {
    this.appsScriptUrl = config.googleSheets?.warrantyWebhookUrl ||
      process.env.GOOGLE_SHEETS_WARRANTY_URL ||
      'https://script.google.com/macros/s/AKfycbzgGYjZQD0m-En0jnBU7L3G9izay9UHq0G3--8HdEcgCl_Vo-yIcK7evT-OL7QhczU59Q/exec';

    this.sheetBestUrl = process.env.SHEETBEST_WARRANTY_URL ||
      'https://api.sheetbest.com/sheets/f6c087ef-7190-4e8f-a6f2-0803e4fa8066';
  }

  /**
   * Push warranty data to Google Sheet via Google Apps Script Web App and SheetBest
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

      // Dispatch to single target (Primary: SheetBest / Configured URL) with fallback
      // Prevents duplicate row insertion when both endpoints point to the same Google Sheet
      const primaryUrl = this.sheetBestUrl || this.appsScriptUrl;
      const fallbackUrl = (this.sheetBestUrl && this.appsScriptUrl) ? this.appsScriptUrl : null;

      try {
        await this._postToTarget(primaryUrl, payload);
        logger.info(`Google Sheet synced successfully via primary target for warranty: ${warrantyNumber}`);
        return { status: 'success', target: 'primary' };
      } catch (primaryError) {
        logger.warn(`Primary Google Sheet target failed (${primaryError.message}). Trying fallback...`);
        if (fallbackUrl && fallbackUrl !== primaryUrl) {
          try {
            await this._postToTarget(fallbackUrl, payload);
            logger.info(`Google Sheet synced successfully via fallback target for warranty: ${warrantyNumber}`);
            return { status: 'success', target: 'fallback' };
          } catch (fallbackError) {
            logger.error(`Fallback Google Sheet target also failed: ${fallbackError.message}`);
            throw new Error(`Google Sheet sync failed: Primary (${primaryError.message}), Fallback (${fallbackError.message})`);
          }
        }
        throw primaryError;
      }
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
