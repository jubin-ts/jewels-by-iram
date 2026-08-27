const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

function generateOrderPDF(order, items, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const logoPath = path.join(__dirname, '..', 'public', 'images', 'logo.jpeg');
  const hasLogo = fs.existsSync(logoPath);

  // Header
  if (hasLogo) {
    doc.image(logoPath, 50, 40, { width: 60 });
  }

  doc.fontSize(20).font('Helvetica-Bold')
    .text('Jewels by Iram', hasLogo ? 120 : 50, 50);
  doc.fontSize(10).font('Helvetica')
    .text('Luxury Anti-Tarnish Jewelry', hasLogo ? 120 : 50, 75)
    .text('UAE | +971 56 724 1398 | info@jewelsbyiram.ae', hasLogo ? 120 : 50, 90);

  // Invoice title
  doc.moveDown(2);
  doc.fontSize(16).font('Helvetica-Bold')
    .text('ORDER INVOICE', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#b8860b');
  doc.moveDown(1);

  // Order info
  const infoTop = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').text('Order Number:', 50, infoTop);
  doc.font('Helvetica').text(order.order_number, 160, infoTop);

  doc.font('Helvetica-Bold').text('Date:', 50, infoTop + 18);
  doc.font('Helvetica').text(new Date(order.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }), 160, infoTop + 18);

  doc.font('Helvetica-Bold').text('Status:', 50, infoTop + 36);
  doc.font('Helvetica').text(order.status.toUpperCase(), 160, infoTop + 36);

  doc.font('Helvetica-Bold').text('Order Type:', 350, infoTop);
  doc.font('Helvetica').text((order.order_type || 'retail').toUpperCase(), 430, infoTop);

  if (order.payment_intent_id) {
    doc.font('Helvetica-Bold').text('Payment ID:', 350, infoTop + 18);
    doc.font('Helvetica').text(order.payment_intent_id, 430, infoTop + 18);
  }

  // Customer info
  doc.moveDown(3);
  doc.y = infoTop + 70;
  doc.fontSize(12).font('Helvetica-Bold').text('Customer Details', 50);
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Name: ${order.customer_name}`);
  doc.text(`Phone: ${order.customer_phone}`);
  if (order.customer_email) doc.text(`Email: ${order.customer_email}`);
  doc.text(`Address: ${order.customer_address}, ${order.city}`);
  if (order.notes) doc.text(`Notes: ${order.notes}`);

  // Items table
  doc.moveDown(1.5);
  doc.fontSize(12).font('Helvetica-Bold').text('Order Items', 50);
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.rect(50, tableTop, 495, 20).fill('#f5f5f5');
  doc.fillColor('#333');
  doc.text('#', 55, tableTop + 5, { width: 25 });
  doc.text('Product', 80, tableTop + 5, { width: 220 });
  doc.text('Qty', 310, tableTop + 5, { width: 50, align: 'center' });
  doc.text('Price', 370, tableTop + 5, { width: 80, align: 'right' });
  doc.text('Subtotal', 460, tableTop + 5, { width: 80, align: 'right' });

  // Table rows
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(9);

  items.forEach(function(item, index) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    const subtotal = item.price * item.quantity;
    doc.fillColor('#333');
    doc.text(String(index + 1), 55, y, { width: 25 });
    doc.text(item.product_name, 80, y, { width: 220 });
    doc.text(String(item.quantity), 310, y, { width: 50, align: 'center' });
    doc.text(`AED ${item.price.toFixed(2)}`, 370, y, { width: 80, align: 'right' });
    doc.text(`AED ${subtotal.toFixed(2)}`, 460, y, { width: 80, align: 'right' });

    y += 20;
    doc.moveTo(50, y - 3).lineTo(545, y - 3).strokeColor('#eee').stroke();
  });

  // Total
  y += 10;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#b8860b').stroke();
  y += 10;
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#333');
  doc.text('TOTAL:', 370, y, { width: 80, align: 'right' });
  doc.text(`AED ${order.total_amount.toFixed(2)}`, 460, y, { width: 80, align: 'right' });

  // Footer
  doc.fontSize(8).font('Helvetica').fillColor('#999');
  doc.text('Thank you for shopping with Jewels by Iram!', 50, 750, { align: 'center', width: 495 });
  doc.text('This is a computer-generated invoice and does not require a signature.', 50, 762, { align: 'center', width: 495 });

  doc.end();
  return doc;
}

module.exports = { generateOrderPDF };
