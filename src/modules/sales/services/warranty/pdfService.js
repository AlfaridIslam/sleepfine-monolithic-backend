import { generateWarrantyPDF as renderPDF } from '../../utils/pdfGenerator.js';
import logger from '../../../../utils/logger.js';

class WarrantyPdfService {
  /**
   * Generate warranty certificate PDF document
   * @param {string} certNumber - Warranty certificate / order number
   * @param {Object} warrantyData - Clean warranty data payload
   * @returns {Promise<{ buffer: Buffer, fileName: string, fileSize: number }>}
   */
  async generateWarrantyPDF(certNumber, warrantyData = {}) {
    try {
      logger.info(`Starting PDF generation for certificate: ${certNumber}`);
      const pdfBuffer = await renderPDF(certNumber, warrantyData);

      const fileName = `Warranty_${certNumber}.pdf`;
      const fileSize = pdfBuffer.length;

      logger.info(`PDF generated successfully: ${fileName} (${fileSize} bytes)`);

      return {
        buffer: pdfBuffer,
        fileName,
        fileSize,
      };
    } catch (error) {
      logger.error(`Error generating warranty PDF for ${certNumber}:`, error);
      throw error;
    }
  }
}

export default new WarrantyPdfService();
