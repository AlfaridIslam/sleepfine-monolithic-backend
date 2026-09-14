import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../../utils/logger.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image paths
const logoPath = path.join(__dirname, '../assets/Warranty_logo.jpg');
const stampPath = path.join(__dirname, '../assets/stamp.jpeg');
const qrPath = path.join(__dirname, '../assets/qr-code.jpeg');

// Helper formatting functions
const formatCurrency = (val) => {
  const n = Number(val) || 0;
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (d) => {
  try {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return new Date().toLocaleDateString();
  }
};

const formatTime = (d) => {
  try {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
};

// ==================== ORDER PDF GENERATION ====================

export const generateOrderPDF = async (order) => {
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
      const contentWidth = pageWidth - (margin * 2);

      // Top Accent Line
      doc.rect(0, 0, pageWidth, 5).fill('#0B3B60');

      // Header Section
      let headerY = 22;
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, margin, headerY, { width: 125, height: 50 });
      } else {
        doc.font('Helvetica-Bold').fontSize(20).fillColor('#0B3B60').text('SleepFine', margin, headerY);
      }

      const compInfoY = headerY + 54;
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('Customer Support: 08062181296  |  Email: contact@sleepfineindia.com  |  www.sleepfineindia.com', margin, compInfoY);

      // Right Header - Order Title & Meta
      const rightX = 300;
      const rightWidth = contentWidth - (rightX - margin);

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0B3B60')
         .text('OFFICIAL ORDER SLIP', rightX, headerY, { width: rightWidth, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
         .text(`Order ID: ${order.orderId}`, rightX, headerY + 22, { width: rightWidth, align: 'right' });

      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Order Date: ${formatDate(order.createdAt)}   |   Priority: ${(order.priority || 'NORMAL').toUpperCase()}`, rightX, headerY + 36, { width: rightWidth, align: 'right' });

      const salesmanName = order.salesman?.name || (order.salesman?.firstName ? `${order.salesman.firstName} ${order.salesman.lastName || ''}`.trim() : 'SleepFine Sales Team');
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Assigned Agent: ${salesmanName}`, rightX, headerY + 48, { width: rightWidth, align: 'right' });

      // Divider Line
      const divY = compInfoY + 16;
      doc.strokeColor('#E2E8F0').lineWidth(0.75).moveTo(margin, divY).lineTo(margin + contentWidth, divY).stroke();

      // Info Cards (Customer & Order Delivery)
      const cardsY = divY + 10;
      const cardWidth = (contentWidth - 14) / 2;
      const cardHeight = 72;

      // Customer Card
      doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7').text('CUSTOMER INFORMATION', margin + 12, cardsY + 10);
      
      const custName = order.customer?.name || 'Customer';
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(custName, margin + 12, cardsY + 23, { width: cardWidth - 24, ellipsis: true });
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`Phone: ${order.customer?.phone || 'Not provided'}`, margin + 12, cardsY + 39);
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`Email: ${order.customer?.email || 'Not provided'}`, margin + 12, cardsY + 52, { width: cardWidth - 24, ellipsis: true });

      // Delivery & Status Card
      const rightCardX = margin + cardWidth + 14;
      doc.roundedRect(rightCardX, cardsY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7').text('ORDER & DELIVERY STATUS', rightCardX + 12, cardsY + 10);

      const status = (order.status || 'CONFIRMED').toUpperCase();
      doc.roundedRect(rightCardX + 12, cardsY + 23, 65, 14, 2).fill('#DCFCE7');
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#15803D').text(status, rightCardX + 12, cardsY + 26, { width: 65, align: 'center' });

      const addressStr = order.customer?.address 
        ? `${order.customer.address.street || ''}, ${order.customer.address.city || ''}, ${order.customer.address.state || ''} ${order.customer.address.zipCode || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
        : 'Store Pickup';
      doc.font('Helvetica').fontSize(8).fillColor('#475569').text(`Delivery: ${addressStr}`, rightCardX + 12, cardsY + 42, { width: cardWidth - 24, ellipsis: true });

      // Table Header
      const tableHeaderY = cardsY + cardHeight + 14;
      const tableHeaderHeight = 22;
      doc.roundedRect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 2).fill('#0B3B60');

      const colNoX = margin + 8;
      const colNoW = 24;
      const colDescX = margin + 36;
      const colDescW = 230;
      const colQtyX = margin + 270;
      const colQtyW = 45;
      const colRateX = margin + 320;
      const colRateW = 85;
      const colTotalX = margin + 410;
      const colTotalW = 105;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.text('#', colNoX, tableHeaderY + 6, { width: colNoW, align: 'center' });
      doc.text('ITEM DESCRIPTION', colDescX, tableHeaderY + 6, { width: colDescW, align: 'left' });
      doc.text('QTY', colQtyX, tableHeaderY + 6, { width: colQtyW, align: 'center' });
      doc.text('UNIT PRICE', colRateX, tableHeaderY + 6, { width: colRateW, align: 'right' });
      doc.text('TOTAL', colTotalX, tableHeaderY + 6, { width: colTotalW, align: 'right' });

      let rowY = tableHeaderY + tableHeaderHeight;
      const items = order.items || [];
      items.forEach((item, index) => {
        const rowHeight = 24;
        const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
        if (index % 2 === 1) {
          doc.rect(margin, rowY, contentWidth, rowHeight).fill('#F8FAFC');
        }

        doc.font('Helvetica').fontSize(8.5).fillColor('#64748B').text(String(index + 1), colNoX, rowY + 7, { width: colNoW, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(item.productName || `Product #${index + 1}`, colDescX, rowY + 7, { width: colDescW, ellipsis: true });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(String(item.quantity || 1), colQtyX, rowY + 7, { width: colQtyW, align: 'center' });
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155').text(formatCurrency(item.unitPrice), colRateX, rowY + 7, { width: colRateW, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(formatCurrency(itemTotal), colTotalX, rowY + 7, { width: colTotalW, align: 'right' });

        doc.strokeColor('#F1F5F9').lineWidth(0.5).moveTo(margin, rowY + rowHeight).lineTo(margin + contentWidth, rowY + rowHeight).stroke();
        rowY += rowHeight;
      });

      doc.strokeColor('#E2E8F0').lineWidth(0.75).moveTo(margin, rowY).lineTo(margin + contentWidth, rowY).stroke();

      // Summary Section
      const summaryY = Math.max(rowY + 12, 290);
      const totalAmount = order.orderDetails?.totalAmount || 0;
      const advanceAmount = order.orderDetails?.advanceAmount || 0;
      const pendingAmount = order.orderDetails?.pendingAmount || Math.max(0, totalAmount - advanceAmount);
      const deliveryCharges = order.orderDetails?.deliveryCharges || 0;
      const discount = order.orderDetails?.discount || 0;

      // Left Column: Payment Overview & Notes
      doc.roundedRect(margin, summaryY, 260, 52, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7').text('PAYMENT OVERVIEW', margin + 10, summaryY + 8);
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Advance Paid:', margin + 10, summaryY + 22);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#16A34A').text(formatCurrency(advanceAmount), margin + 120, summaryY + 22, { width: 130, align: 'right' });

      doc.font('Helvetica').fontSize(8.5).fillColor(pendingAmount > 0 ? '#DC2626' : '#16A34A').text('Balance on Delivery:', margin + 10, summaryY + 36);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(pendingAmount > 0 ? '#DC2626' : '#16A34A').text(formatCurrency(pendingAmount), margin + 120, summaryY + 36, { width: 130, align: 'right' });

      const notesY = summaryY + 60;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text('ORDER & DISPATCH NOTES', margin, notesY);
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
         .text(order.notes || '1. Delivery will be scheduled post confirmation. Balance payable upon delivery.', margin, notesY + 12, { width: 260 })
         .text('2. Warranty certificate will be initiated upon product delivery & verification.', margin, notesY + 24, { width: 260 });

      // Right Column: Financial Breakdown
      const rightColX = margin + contentWidth - 235;
      const rightColW = 235;
      doc.roundedRect(rightColX, summaryY, rightColW, 105, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

      let finY = summaryY + 8;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Order Total:', rightColX + 12, finY);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(formatCurrency(totalAmount), rightColX + 100, finY, { width: rightColW - 112, align: 'right' });

      if (deliveryCharges > 0) {
        finY += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text('Delivery Charges:', rightColX + 12, finY);
        doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(formatCurrency(deliveryCharges), rightColX + 100, finY, { width: rightColW - 112, align: 'right' });
      }

      if (discount > 0) {
        finY += 14;
        doc.font('Helvetica').fontSize(8).fillColor('#16A34A').text('Discount Applied:', rightColX + 12, finY);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#16A34A').text(`- ${formatCurrency(discount)}`, rightColX + 100, finY, { width: rightColW - 112, align: 'right' });
      }

      finY += 18;
      doc.roundedRect(rightColX + 6, finY, rightColW - 12, 28, 3).fill('#0B3B60');
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#FFFFFF').text('NET PAYABLE:', rightColX + 16, finY + 9);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text(formatCurrency(totalAmount + deliveryCharges - discount), rightColX + 110, finY + 8, { width: rightColW - 128, align: 'right' });

      // Seal & Stamp
      const sealSectionY = 670;
      doc.roundedRect(margin, sealSectionY, 280, 75, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60').text('SleepFine Authentic Guarantee', margin + 12, sealSectionY + 10);
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('• Certified genuine SleepFine mattress & bedding product', margin + 12, sealSectionY + 24)
         .text('• Direct factory dispatch with tamper-proof packaging', margin + 12, sealSectionY + 36)
         .text('• Customer Helpline: 08062181296 | contact@sleepfineindia.com', margin + 12, sealSectionY + 48)
         .text('• Track orders online at www.sleepfineindia.com', margin + 12, sealSectionY + 60);

      const sigX = 355;
      const sigW = margin + contentWidth - sigX;
      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, sigX + 15, sealSectionY, { width: 62, height: 62, opacity: 0.88 });
      }
      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, sigX + 95, sealSectionY + 2, { width: 56, height: 56 });
      }

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text('AUTHORIZED SIGNATORY', sigX, sealSectionY + 66, { width: sigW, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8').text('SleepFine India Pvt Ltd', sigX, sealSectionY + 76, { width: sigW, align: 'center' });

      // Footer
      const footerY = 788;
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
         .text('SleepFine India • Designed for Superior Comfort & Healthy Sleep • www.sleepfineindia.com', margin, footerY + 8, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('Error generating order PDF:', error);
      reject(error);
    }
  });
};

// ==================== INVOICE PDF GENERATION ====================

export const generateInvoicePDF = async (order, invoiceData = {}) => {
  const mergedData = order || invoiceData;
  return generateOrderPDF(mergedData);
};

// ==================== WARRANTY PDF GENERATION ====================

export const generateWarrantyPDF = async (orderId, warrantyData = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const data = warrantyData || {};
      const displayLength = data.sizeType === "standard" ? data.length : data.customLength;
      const displayBreadth = data.sizeType === "standard" ? data.breadth : data.customBreadth;
      const displayHeight = data.sizeType === "standard" ? data.height : data.customHeight;

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

      // 1. Top Decorative Brand Bar
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

      // Right Header - Warranty Certificate Badge
      const badgeWidth = 205;
      const badgeX = pageWidth - margin - badgeWidth;
      const badgeY = headerY + 2;

      doc.roundedRect(badgeX, badgeY, badgeWidth, 26, 4).fill('#0B3B60');
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF')
         .text('WARRANTY CERTIFICATE', badgeX, badgeY + 7, { width: badgeWidth, align: 'center' });

      const certNo = data.warrantyNumber || data.orderNumber || orderId || `WR-${Date.now()}`;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B')
         .text('Certificate No:', badgeX, badgeY + 34, { width: 85, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0B3B60')
         .text(certNo, badgeX + 85, badgeY + 33, { width: badgeWidth - 85, align: 'right' });

      const invDate = data.invoiceDate || formatDate(new Date());
      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Invoice Date:', badgeX, badgeY + 48, { width: 85, align: 'left' });
      doc.font('Helvetica').fontSize(8).fillColor('#1E293B')
         .text(invDate, badgeX + 85, badgeY + 48, { width: badgeWidth - 85, align: 'right' });

      const warrantyPeriod = data.warranty || data.warrantyPeriod || '5 Years Comprehensive';
      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('Coverage:', badgeX, badgeY + 61, { width: 85, align: 'left' });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#15803D')
         .text(warrantyPeriod, badgeX + 85, badgeY + 61, { width: badgeWidth - 85, align: 'right' });

      // Divider Line
      const divY = 112;
      doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(margin, divY).lineTo(margin + contentWidth, divY).stroke();

      // 3. Information Cards
      const cardY = divY + 10;
      const cardWidth = (contentWidth - 12) / 2; // ~255.6 pt
      const cardHeight = 90;

      // Card 1: Customer Details
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('CUSTOMER INFORMATION', margin + 10, cardY + 8);

      const custName = data.customerName || data.name || 'Valued Customer';
      const custPhone = data.mobileNumber || data.phone || data.customerPhone || 'N/A';
      const custEmail = data.email || data.customerEmail || 'N/A';
      const custCity = data.city || '';
      const custState = data.state || '';
      const custLoc = [custCity, custState].filter(Boolean).join(', ') || 'N/A';
      const custAddress = data.address || 'Direct Delivery';

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B').text(custName, margin + 10, cardY + 24);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Phone: ${custPhone}`, margin + 10, cardY + 38);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Email: ${custEmail}`, margin + 10, cardY + 50);
      doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(`Location: ${custLoc} | ${custAddress}`, margin + 10, cardY + 62, { width: cardWidth - 20, height: 24 });

      // Card 2: Mattress & Purchase Details
      const card2X = margin + cardWidth + 12;
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('MATTRESS SPECIFICATIONS', card2X + 10, cardY + 8);

      const product = data.selectedProduct || data.product || 'SleepFine Orthopedic Mattress';
      const variety = data.selectedVariety || data.variety || 'Standard Collection';
      const sizeType = data.sizeType || 'standard';
      const dimensions = (displayLength && displayBreadth)
        ? `${displayLength} x ${displayBreadth} x ${displayHeight || 'Standard'} in`
        : 'Standard Size';

      const purchaseSource = data.purchaseFrom === 'Store'
        ? `Store: ${data.selectedStore || 'SleepFine Official Store'}`
        : (data.purchaseFrom === 'Others' ? `Dealer: ${data.dealerName || 'Authorized Dealer'}` : 'SleepFine Direct');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B').text(product, card2X + 10, cardY + 24);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Variety: ${variety}`, card2X + 10, cardY + 38);
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Dimensions: ${dimensions} (${sizeType})`, card2X + 10, cardY + 50);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#0284C7').text(purchaseSource, card2X + 10, cardY + 64);

      // 4. Warranty Coverage Table
      const tableY = cardY + cardHeight + 14;
      const thHeight = 22;
      doc.rect(margin, tableY, contentWidth, thHeight).fill('#0B3B60');

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.text('#', margin + 6, tableY + 6, { width: 25 });
      doc.text('COVERED DEFECTS & ASSURANCE', margin + 35, tableY + 6, { width: 340 });
      doc.text('RESOLUTION', margin + 385, tableY + 6, { width: 130, align: 'right' });

      const coverageRows = [
        { no: '1', title: 'Core Sagging & Depression', desc: 'Any body impression or sagging exceeding 1.5 inches under normal domestic usage.', res: 'Core Replacement / Repair' },
        { no: '2', title: 'Spring Coil Structural Faults', desc: 'Broken, loose, or protruding spring units, rattling or edge collapsing.', res: 'Free Factory Repair' },
        { no: '3', title: 'Bonded Foam & Rebond Separation', desc: 'Delamination, crumbling, or manufacturing adhesive separation of inner layers.', res: 'Component Replacement' },
        { no: '4', title: 'Fabric Quilting & Stitching Defects', desc: 'Open seams or stitching detachment reported within the first 12 months.', res: 'Complimentary Re-stitching' }
      ];

      let curY = tableY + thHeight;
      const rowHeight = 32;

      coverageRows.forEach((row, index) => {
        const isEven = index % 2 === 1;
        if (isEven) {
          doc.rect(margin, curY, contentWidth, rowHeight).fill('#F8FAFC');
        }
        doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(margin, curY + rowHeight).lineTo(margin + contentWidth, curY + rowHeight).stroke();

        doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(row.no, margin + 6, curY + 6, { width: 25 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(row.title, margin + 35, curY + 6);
        doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(row.desc, margin + 35, curY + 18, { width: 340 });
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#15803D').text(row.res, margin + 385, curY + 10, { width: 130, align: 'right' });

        curY += rowHeight;
      });

      // 5. Terms & Conditions Box
      const termsY = curY + 12;
      const termsWidth = contentWidth - 190;
      const termsHeight = 125;
      doc.roundedRect(margin, termsY, termsWidth, termsHeight, 4).fillAndStroke('#FFFBEB', '#FDE68A');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B45309')
         .text('WARRANTY TERMS & CONDITIONS', margin + 12, termsY + 8);

      const termsList = [
        '1. Warranty is valid only for the original retail purchaser upon production of this certificate & original invoice.',
        '2. Normal softening or gradual body indentation under 1.5 inches is characteristic of luxury foam and not a defect.',
        '3. Use a sturdy, proper foundation/bed frame. Improper slats or curved surfaces void this warranty.',
        '4. Warranty does not cover stains, burns, improper cleaning, liquid spills, bent border wires, or transit accidents.',
        '5. For warranty inspection or claim assistance, call 08062181296 or email contact@sleepfineindia.com.'
      ];

      let tY = termsY + 22;
      termsList.forEach(t => {
        doc.font('Helvetica').fontSize(7).fillColor('#78350F')
           .text(t, margin + 12, tY, { width: termsWidth - 24 });
        tY += doc.heightOfString(t, { width: termsWidth - 24 }) + 3;
      });

      // Guarantee Seal & QR (Right Box)
      const sealBoxX = margin + termsWidth + 12;
      const sealBoxWidth = 178;
      doc.roundedRect(sealBoxX, termsY, sealBoxWidth, termsHeight, 4).fillAndStroke('#F8FAFC', '#CBD5E1');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('SLEEPFINE ASSURANCE', sealBoxX + 10, termsY + 8, { width: sealBoxWidth - 20, align: 'center' });

      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, sealBoxX + 18, termsY + 26, { width: 55, height: 42, opacity: 0.85 });
      }
      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, sealBoxX + 95, termsY + 26, { width: 42, height: 42 });
      }

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B')
         .text('AUTHORIZED SIGNATORY', sealBoxX + 10, termsY + 86, { width: sealBoxWidth - 20, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#64748B')
         .text('SleepFine Quality Assurance Division', sealBoxX + 10, termsY + 98, { width: sealBoxWidth - 20, align: 'center' });

      // 6. Footer
      const footerY = 785;
      doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
         .text('SleepFine India • Designed for Superior Comfort & Healthy Sleep • www.sleepfineindia.com', margin, footerY + 8, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('Error generating warranty PDF:', error);
      reject(error);
    }
  });
};


// Generate Store Invoice PDF (for walk-in customers)
export const generateStoreInvoicePDF = async (storeInvoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      // Standard A4 Size: 595.28 x 841.89 pt
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

      // Company Info below logo
      const compInfoY = headerY + 54;
      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('Customer Support: 08062181296  |  Email: contact@sleepfineindia.com  |  www.sleepfineindia.com', margin, compInfoY);

      // Right Header - Invoice Title & Meta
      const rightX = 300;
      const rightWidth = contentWidth - (rightX - margin);

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0B3B60')
         .text('RETAIL STORE INVOICE', rightX, headerY, { width: rightWidth, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A')
         .text(`Receipt #: ${storeInvoiceData.receiptNumber || 'REC-' + Date.now()}`, rightX, headerY + 22, { width: rightWidth, align: 'right' });

      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Date: ${formatDate(storeInvoiceData.createdAt)}   |   Time: ${formatTime(storeInvoiceData.createdAt)}`, rightX, headerY + 36, { width: rightWidth, align: 'right' });

      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Sales Executive: ${storeInvoiceData.salesmanName || 'Store Staff'}`, rightX, headerY + 48, { width: rightWidth, align: 'right' });

      // Divider Line
      const divY = compInfoY + 16;
      doc.strokeColor('#E2E8F0').lineWidth(0.75).moveTo(margin, divY).lineTo(margin + contentWidth, divY).stroke();

      // 3. Info Cards (Customer & Payment)
      const cardsY = divY + 10;
      const cardWidth = (contentWidth - 14) / 2;
      const cardHeight = 72;

      // Left Card: Customer Details
      doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7')
         .text('BILLED TO (CUSTOMER)', margin + 12, cardsY + 10);

      const customerName = storeInvoiceData.customerName || 'Walk-in Customer';
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A')
         .text(customerName, margin + 12, cardsY + 23, { width: cardWidth - 24, ellipsis: true });

      const customerPhone = storeInvoiceData.customerPhone || 'Not provided';
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Phone: ${customerPhone}`, margin + 12, cardsY + 39);

      const customerEmail = storeInvoiceData.customerEmail || 'Not provided';
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text(`Email: ${customerEmail}`, margin + 12, cardsY + 52, { width: cardWidth - 24, ellipsis: true });

      // Right Card: Payment & Store Details
      const rightCardX = margin + cardWidth + 14;
      doc.roundedRect(rightCardX, cardsY, cardWidth, cardHeight, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7')
         .text('PAYMENT & STORE INFO', rightCardX + 12, cardsY + 10);

      const paymentMethod = storeInvoiceData.paymentMethod || 'Cash';
      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text('Payment Mode: ', rightCardX + 12, cardsY + 23, { continued: true })
         .font('Helvetica-Bold').fillColor('#0F172A').text(paymentMethod);

      // Status pill badge
      const statusText = (storeInvoiceData.paymentStatus || 'COMPLETED').toUpperCase();
      const isPaid = statusText === 'COMPLETED' || statusText === 'PAID';
      const badgeBg = isPaid ? '#DCFCE7' : '#FEF3C7';
      const badgeText = isPaid ? '#15803D' : '#B45309';

      doc.roundedRect(rightCardX + 12, cardsY + 37, 65, 14, 2).fill(badgeBg);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(badgeText)
         .text(statusText, rightCardX + 12, cardsY + 40, { width: 65, align: 'center' });

      doc.font('Helvetica').fontSize(8).fillColor('#475569')
         .text('SleepFine Experience Center', rightCardX + 85, cardsY + 39);

      doc.font('Helvetica').fontSize(8).fillColor('#64748B')
         .text('In-Store Retail Purchase', rightCardX + 12, cardsY + 54);

      // 4. Items Table
      const tableHeaderY = cardsY + cardHeight + 14;
      const tableHeaderHeight = 22;

      doc.roundedRect(margin, tableHeaderY, contentWidth, tableHeaderHeight, 2).fill('#0B3B60');

      const colNoX = margin + 8;
      const colNoW = 24;
      const colDescX = margin + 36;
      const colDescW = 230;
      const colQtyX = margin + 270;
      const colQtyW = 45;
      const colRateX = margin + 320;
      const colRateW = 85;
      const colTotalX = margin + 410;
      const colTotalW = 105;

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF');
      doc.text('#', colNoX, tableHeaderY + 6, { width: colNoW, align: 'center' });
      doc.text('ITEM DESCRIPTION', colDescX, tableHeaderY + 6, { width: colDescW, align: 'left' });
      doc.text('QTY', colQtyX, tableHeaderY + 6, { width: colQtyW, align: 'center' });
      doc.text('UNIT RATE', colRateX, tableHeaderY + 6, { width: colRateW, align: 'right' });
      doc.text('AMOUNT', colTotalX, tableHeaderY + 6, { width: colTotalW, align: 'right' });

      let rowY = tableHeaderY + tableHeaderHeight;
      const items = storeInvoiceData.items || [];
      let calculatedSubtotal = 0;

      items.forEach((item, index) => {
        const rowHeight = 24;
        const itemTotal = (item.quantity || 1) * (item.rate || 0);
        calculatedSubtotal += itemTotal;

        if (index % 2 === 1) {
          doc.rect(margin, rowY, contentWidth, rowHeight).fill('#F8FAFC');
        }

        doc.font('Helvetica').fontSize(8.5).fillColor('#64748B')
           .text(String(index + 1), colNoX, rowY + 7, { width: colNoW, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
           .text(item.productName || `Product #${index + 1}`, colDescX, rowY + 7, { width: colDescW, ellipsis: true });

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
           .text(String(item.quantity || 1), colQtyX, rowY + 7, { width: colQtyW, align: 'center' });

        doc.font('Helvetica').fontSize(8.5).fillColor('#334155')
           .text(formatCurrency(item.rate), colRateX, rowY + 7, { width: colRateW, align: 'right' });

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
           .text(formatCurrency(itemTotal), colTotalX, rowY + 7, { width: colTotalW, align: 'right' });

        doc.strokeColor('#F1F5F9').lineWidth(0.5)
           .moveTo(margin, rowY + rowHeight).lineTo(margin + contentWidth, rowY + rowHeight).stroke();

        rowY += rowHeight;
      });

      doc.strokeColor('#E2E8F0').lineWidth(0.75)
         .moveTo(margin, rowY).lineTo(margin + contentWidth, rowY).stroke();

      // 5. Calculations & Summary
      const summaryY = Math.max(rowY + 12, 290);
      const subtotal = storeInvoiceData.subtotal || calculatedSubtotal;
      
      let gstAmount = 0;
      let gstRate = 18;

      if (storeInvoiceData.gstAmount) {
        gstAmount = storeInvoiceData.gstAmount;
      } else if (storeInvoiceData.gst !== undefined && storeInvoiceData.gst !== null) {
        if (storeInvoiceData.gst > 100) {
          gstAmount = storeInvoiceData.gst;
          gstRate = subtotal > 0 ? Math.round((gstAmount / subtotal) * 100) : 18;
        } else {
          gstRate = storeInvoiceData.gst;
          gstAmount = (subtotal * gstRate) / 100;
        }
      } else {
        gstAmount = (subtotal * 18) / 100;
      }

      const cgst = gstAmount / 2;
      const sgst = gstAmount / 2;
      const finalTotal = storeInvoiceData.totalAmount || (subtotal + gstAmount);
      const amountPaid = storeInvoiceData.amountPaid || finalTotal;
      const balanceDue = Math.max(0, finalTotal - amountPaid);
      const changeReturned = Math.max(0, amountPaid - finalTotal);

      // Left Column: Payment Settlement & Terms
      const leftColW = 260;

      doc.roundedRect(margin, summaryY, leftColW, 52, 4).fillAndStroke('#F8FAFC', '#E2E8F0');
      
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0284C7')
         .text('PAYMENT SETTLEMENT', margin + 10, summaryY + 8);

      doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
         .text('Total Received:', margin + 10, summaryY + 22);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A')
         .text(formatCurrency(amountPaid), margin + 120, summaryY + 22, { width: 130, align: 'right' });

      if (balanceDue > 0) {
        doc.font('Helvetica').fontSize(8.5).fillColor('#DC2626')
           .text('Balance Due:', margin + 10, summaryY + 36);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#DC2626')
           .text(formatCurrency(balanceDue), margin + 120, summaryY + 36, { width: 130, align: 'right' });
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor('#16A34A')
           .text('Change Returned:', margin + 10, summaryY + 36);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#16A34A')
           .text(formatCurrency(changeReturned), margin + 120, summaryY + 36, { width: 130, align: 'right' });
      }

      // Terms Box
      const termsY = summaryY + 60;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text('TERMS & INVOICE NOTES', margin, termsY);
      doc.font('Helvetica').fontSize(7).fillColor('#64748B')
         .text('1. Warranty covers manufacturing defects as per SleepFine policy guidelines.', margin, termsY + 12)
         .text('2. Please retain this invoice and warranty card for future service or claim assistance.', margin, termsY + 22)
         .text('3. This is an electronically generated retail invoice and requires no physical signature.', margin, termsY + 32);

      // Right Column: Financial Breakdown Card
      const rightColX = margin + contentWidth - 235;
      const rightColW = 235;
      const finCardH = 105;

      doc.roundedRect(rightColX, summaryY, rightColW, finCardH, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

      let finY = summaryY + 8;
      doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text('Subtotal:', rightColX + 12, finY);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0F172A').text(formatCurrency(subtotal), rightColX + 100, finY, { width: rightColW - 112, align: 'right' });

      finY += 16;
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`CGST (${(gstRate/2).toFixed(1)}%):`, rightColX + 12, finY);
      doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(formatCurrency(cgst), rightColX + 100, finY, { width: rightColW - 112, align: 'right' });

      finY += 14;
      doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`SGST (${(gstRate/2).toFixed(1)}%):`, rightColX + 12, finY);
      doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(formatCurrency(sgst), rightColX + 100, finY, { width: rightColW - 112, align: 'right' });

      finY += 18;
      const bannerH = 28;
      doc.roundedRect(rightColX + 6, finY, rightColW - 12, bannerH, 3).fill('#0B3B60');

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#FFFFFF')
         .text('TOTAL AMOUNT:', rightColX + 16, finY + 9);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF')
         .text(formatCurrency(finalTotal), rightColX + 110, finY + 8, { width: rightColW - 128, align: 'right' });

      // 6. Signatory / Seal & Assurance Section
      const sealSectionY = 670;

      doc.roundedRect(margin, sealSectionY, 280, 75, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0B3B60')
         .text('SleepFine Authentic Guarantee', margin + 12, sealSectionY + 10);

      doc.font('Helvetica').fontSize(7.5).fillColor('#64748B')
         .text('• Certified genuine SleepFine quality sleep product', margin + 12, sealSectionY + 24)
         .text('• Free door-step warranty inspection on eligible models', margin + 12, sealSectionY + 36)
         .text('• Toll-Free Helpline: 08062181296 (Mon-Sat, 9am - 7pm)', margin + 12, sealSectionY + 48)
         .text('• Registered Office: SleepFine India, Bangalore, Karnataka', margin + 12, sealSectionY + 60);

      const sigX = 355;
      const sigW = margin + contentWidth - sigX;

      if (fs.existsSync(stampPath)) {
        doc.image(stampPath, sigX + 15, sealSectionY, { width: 62, height: 62, opacity: 0.88 });
      }

      if (fs.existsSync(qrPath)) {
        doc.image(qrPath, sigX + 95, sealSectionY + 2, { width: 56, height: 56 });
      }

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155')
         .text('AUTHORIZED SIGNATORY', sigX, sealSectionY + 66, { width: sigW, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).fillColor('#94A3B8')
         .text('SleepFine India Pvt Ltd', sigX, sealSectionY + 76, { width: sigW, align: 'center' });

      // 7. Page Footer
      const footerY = 788;
      doc.strokeColor('#E2E8F0').lineWidth(0.5)
         .moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke();

      doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
         .text('SleepFine India • Designed for Superior Comfort & Healthy Sleep • www.sleepfineindia.com', margin, footerY + 8, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (error) {
      logger.error('Error generating store invoice PDF:', error);
      reject(error);
    }
  });
};

