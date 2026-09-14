import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from '../../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asset paths
const logoPath = path.join(__dirname, '../../sales/assets/Warranty_logo.jpg');
const stampPath = path.join(__dirname, '../../sales/assets/stamp.jpeg');
const qrPath = path.join(__dirname, '../../sales/assets/qr-code.jpeg');

const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Generate Professional A4 Gatepass PDF
 * 
 * Standard ISO A4 Dimensions: 595.28 x 841.89 pt
 * Mobile & Desktop Universal Layout
 */
export const generateGatepassPDF = async (gatepassData, orderData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 25, bottom: 25, left: 36, right: 36 },
        autoFirstPage: true
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = 595.28;
      const margin = 36;
      const contentWidth = pageWidth - (margin * 2); // 523.28 pt

      // 1. Top Brand Accent Line
      doc.rect(0, 0, pageWidth, 5).fill('#0B3B60');

      // 2. Header Section
      let headerY = 22;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, headerY, { width: 125, height: 50 });
      } else {
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0B3B60').text('SleepFine', margin, headerY);
      }

      const compInfoY = headerY + 54;
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('Customer Support: 08062181296  |  Email: contact@sleepfineindia.com  |  www.sleepfineindia.com', margin, compInfoY);

      // Right Header - Gatepass Badge
      const badgeWidth = 190;
      const badgeX = pageWidth - margin - badgeWidth;
      const badgeY = headerY + 2;

      doc.roundedRect(badgeX, badgeY, badgeWidth, 26, 4).fill('#0B3B60');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF')
         .text('DELIVERY GATEPASS', badgeX, badgeY + 7, { width: badgeWidth, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B')
         .text('Gatepass No:', badgeX, badgeY + 34, { width: 75, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0B3B60')
         .text(gatepassData.gatepassId || 'GP-N/A', badgeX + 80, badgeY + 33, { width: badgeWidth - 80, align: 'right' });

      const issuedDate = gatepassData.issuedAt
        ? new Date(gatepassData.issuedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Issued Date:', badgeX, badgeY + 48, { width: 75, align: 'left' });
      doc.font('Helvetica').fontSize(8).fillColor('#1E293B')
         .text(issuedDate, badgeX + 80, badgeY + 48, { width: badgeWidth - 80, align: 'right' });

      const validUntil = gatepassData.validUntil
        ? new Date(gatepassData.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Valid for 7 Days';

      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Valid Until:', badgeX, badgeY + 61, { width: 75, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#DC2626')
         .text(validUntil, badgeX + 80, badgeY + 61, { width: badgeWidth - 80, align: 'right' });

      // Divider Line
      const divY = 112;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(margin, divY).lineTo(margin + contentWidth, divY).stroke();

      // 3. Information Cards: Delivery & Driver Info vs Customer Info
      const cardY = divY + 10;
      const cardWidth = (contentWidth - 12) / 2; // ~255.6 pt
      const cardHeight = 84;

      // Card 1: Logistics & Driver Details
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('LOGISTICS & VEHICLE DETAILS', margin + 10, cardY + 8);

      const driverName = gatepassData.driverDetails?.fullName || gatepassData.driverDetails?.name || gatepassData.driver?.fullName || 'Not Assigned';
      const driverPhone = gatepassData.driverDetails?.phone || gatepassData.driver?.phone || 'N/A';
      const vehicleNumber = gatepassData.deliveryDetails?.vehicleNumber || gatepassData.driverDetails?.vehicleNumber || gatepassData.vehicleNumber || 'Pending Assignment';
      const orderId = gatepassData.orderId || (gatepassData.order?.orderId) || (orderData.orderId) || 'N/A';

      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Order Reference:', margin + 10, cardY + 24);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(orderId, margin + 85, cardY + 24);

      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Driver Name:', margin + 10, cardY + 38);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(driverName, margin + 85, cardY + 38);

      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Driver Phone:', margin + 10, cardY + 52);
      doc.font('Helvetica').fontSize(8).fillColor('#1E293B').text(driverPhone, margin + 85, cardY + 52);

      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Vehicle No:', margin + 10, cardY + 66);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0284C7').text(vehicleNumber, margin + 85, cardY + 66);

      // Card 2: Customer & Destination Details
      const card2X = margin + cardWidth + 12;
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('DELIVERY DESTINATION', card2X + 10, cardY + 8);

      const customerName = gatepassData.customer?.name || orderData.customer?.name || gatepassData.order?.customer?.name || 'Customer';
      const customerPhone = gatepassData.customer?.phone || orderData.customer?.phone || gatepassData.order?.customer?.phone || 'N/A';
      const addressObj = gatepassData.deliveryAddress || orderData.deliveryAddress || orderData.customer?.address || {};
      const fullAddress = typeof addressObj === 'string'
        ? addressObj
        : [addressObj.street, addressObj.city, addressObj.state, addressObj.pincode || addressObj.zipCode].filter(Boolean).join(', ') || 'Standard Delivery Address';

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B').text(customerName, card2X + 10, cardY + 24, { width: cardWidth - 20 });
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Phone: ${customerPhone}`, card2X + 10, cardY + 38);
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`Destination: ${fullAddress}`, card2X + 10, cardY + 52, { width: cardWidth - 20, height: 28 });

      // 4. Items Table
      const tableY = cardY + cardHeight + 14;
      const colNo = 30;
      const colQty = 55;
      const colRate = 80;
      const colAmount = 90;
      const colDesc = contentWidth - (colNo + colQty + colRate + colAmount);

      const thHeight = 22;
      doc.rect(margin, tableY, contentWidth, thHeight).fill('#0B3B60');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      let thX = margin;
      doc.text('#', thX + 6, tableY + 6, { width: colNo, align: 'left' });
      thX += colNo;
      doc.text('ITEM DESCRIPTION / SPECIFICATION', thX + 6, tableY + 6, { width: colDesc, align: 'left' });
      thX += colDesc;
      doc.text('QTY', thX, tableY + 6, { width: colQty, align: 'center' });
      thX += colQty;
      doc.text('UNIT RATE', thX, tableY + 6, { width: colRate - 6, align: 'right' });
      thX += colRate;
      doc.text('TOTAL', thX, tableY + 6, { width: colAmount - 10, align: 'right' });

      // Render Items
      const items = gatepassData.items || orderData.items || [];
      let curY = tableY + thHeight;
      const rowHeight = 22;

      items.forEach((item, index) => {
        const isEven = index % 2 === 1;
        if (isEven) {
          doc.rect(margin, curY, contentWidth, rowHeight).fill('#F8FAFC');
        }

        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(margin, curY + rowHeight).lineTo(margin + contentWidth, curY + rowHeight).stroke();

        const pName = item.productName || item.name || `Mattress / Item ${index + 1}`;
        const qty = item.quantity || 1;
        const rate = item.rate || item.unitPrice || 0;
        const total = (qty * rate) || item.totalPrice || 0;

        doc.font('Helvetica').fontSize(8).fillColor('#64748B')
           .text((index + 1).toString(), margin + 6, curY + 6, { width: colNo, align: 'left' });

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B')
           .text(pName, margin + colNo + 6, curY + 6, { width: colDesc - 12, lineBreak: false, ellipsis: true });

        doc.font('Helvetica').fontSize(8).fillColor('#1E293B')
           .text(qty.toString(), margin + colNo + colDesc, curY + 6, { width: colQty, align: 'center' });

        doc.font('Helvetica').fontSize(8).fillColor('#475569')
           .text(formatCurrency(rate), margin + colNo + colDesc + colQty, curY + 6, { width: colRate - 6, align: 'right' });

        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0B3B60')
           .text(formatCurrency(total), margin + colNo + colDesc + colQty + colRate, curY + 6, { width: colAmount - 10, align: 'right' });

        curY += rowHeight;
      });

      // 5. Payment & Verification Section
      const paymentSectionY = curY + 12;
      const payBoxWidth = 240;
      const payBoxX = pageWidth - margin - payBoxWidth;

      // Special Instructions / Gate Pass Security Box (Left side)
      const noticeWidth = contentWidth - payBoxWidth - 16;
      doc.roundedRect(margin, paymentSectionY, noticeWidth, 105, 4).fillAndStroke('#FFFBEB', '#FDE68A');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B45309')
         .text('GATE EXIT VERIFICATION NOTICE', margin + 12, paymentSectionY + 8);

      const instructions = gatepassData.specialInstructions || 'Ensure physical count matches item quantities before dispatch.';
      doc.font('Helvetica').fontSize(7.5).fillColor('#78350F')
         .text('1. This gatepass authorizes movement of the specified goods from SleepFine facility.', margin + 12, paymentSectionY + 24, { width: noticeWidth - 24 })
         .text('2. Security personnel must inspect vehicle seals and verify driver credentials before gate exit.', margin + 12, paymentSectionY + 40, { width: noticeWidth - 24 })
         .text(`3. Driver Instructions: ${instructions}`, margin + 12, paymentSectionY + 56, { width: noticeWidth - 24 })
         .text('4. Driver must collect pending cash/cheque and return signed delivery receipt to accounts.', margin + 12, paymentSectionY + 76, { width: noticeWidth - 24 });

      // Payment Summary Box (Right side)
      const payTotal = gatepassData.paymentDetails?.totalAmount || orderData.orderDetails?.totalAmount || 0;
      const payAdvance = gatepassData.paymentDetails?.advanceAmount || orderData.orderDetails?.advanceAmount || 0;
      const payPending = Math.max(0, payTotal - payAdvance);

      doc.roundedRect(payBoxX, paymentSectionY, payBoxWidth, 105, 4).fillAndStroke('#F8FAFC', '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('DELIVERY PAYMENT SUMMARY', payBoxX + 12, paymentSectionY + 8);

      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Order Total Amount:', payBoxX + 12, paymentSectionY + 28);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B')
         .text(formatCurrency(payTotal), payBoxX + 120, paymentSectionY + 28, { width: payBoxWidth - 132, align: 'right' });

      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Advance Paid:', payBoxX + 12, paymentSectionY + 44);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#15803D')
         .text(formatCurrency(payAdvance), payBoxX + 120, paymentSectionY + 44, { width: payBoxWidth - 132, align: 'right' });

      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(payBoxX + 10, paymentSectionY + 62).lineTo(payBoxX + payBoxWidth - 10, paymentSectionY + 62).stroke();

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#DC2626')
         .text('BALANCE TO COLLECT:', payBoxX + 12, paymentSectionY + 74);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#DC2626')
         .text(formatCurrency(payPending), payBoxX + 120, paymentSectionY + 74, { width: payBoxWidth - 132, align: 'right' });

      // 6. Signature & Authorization Blocks
      const signY = paymentSectionY + 115;
      const signBoxWidth = contentWidth / 3;

      // Issuer Signature
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Prepared By / Warehouse Supervisor', margin, signY + 38, { width: signBoxWidth - 10, align: 'center' });
      doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(margin + 20, signY + 35).lineTo(margin + signBoxWidth - 20, signY + 35).stroke();

      // Security Gate Officer
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Security Gate Exit Stamp & Sign', margin + signBoxWidth, signY + 38, { width: signBoxWidth - 10, align: 'center' });
      doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(margin + signBoxWidth + 20, signY + 35).lineTo(margin + (signBoxWidth * 2) - 20, signY + 35).stroke();

      // Driver Signature
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Driver / Receiver Signature', margin + (signBoxWidth * 2), signY + 38, { width: signBoxWidth - 10, align: 'center' });
      doc.strokeColor('#CBD5E1').lineWidth(0.5).moveTo(margin + (signBoxWidth * 2) + 20, signY + 35).lineTo(margin + contentWidth - 20, signY + 35).stroke();

      // Stamp and QR Code if available
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, margin + (signBoxWidth * 2) + 20, signY - 20, { width: 45, height: 35, opacity: 0.8 });
      }
      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, margin + signBoxWidth + 65, signY - 20, { width: 35, height: 35 });
      }

      // 7. Footer
      const footerY = 785;
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
         .text('SleepFine Logistics System • Official Material Movement Authorization • Generated automatically', margin, footerY + 8, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('Error generating gatepass PDF:', error);
      reject(error);
    }
  });
};

export default {
  generateGatepassPDF
};
