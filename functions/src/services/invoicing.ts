/**
 * Invoicing service - PDF generation, storage, and email queueing
 */

import PDFDocument from 'pdfkit';
import { InvoiceLine, VAT_RATE } from '../types';
import { emailRepo, storageRepo } from '../repositories';
import { calculateVat, formatNairaAmount, generateInvoiceNumber } from '../utils/formatting';
import { invoiceStoragePath } from '../subscriptionLifecycle';

export async function renderInvoicePdfBuffer(params: {
  invoiceNumber: string;
  issuedTo: string;
  email: string;
  issuedAt: Date;
  lineItems: InvoiceLine[];
  subtotalNgn: number;
  vatNgn: number;
  totalNgn: number;
  notes?: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('SHOOUTS TAX INVOICE', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Invoice No: ${params.invoiceNumber}`);
    doc.text(`Issued: ${params.issuedAt.toISOString()}`);
    doc.text(`Bill To: ${params.issuedTo}`);
    doc.text(`Email: ${params.email}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Items', { underline: true });
    doc.moveDown(0.4);
    params.lineItems.forEach((line) => {
      doc.fontSize(10).text(
        `${line.description}  | Qty: ${line.qty}  | Unit: NGN ${formatNairaAmount(line.unitAmountNgn)}  | Total: NGN ${formatNairaAmount(line.totalAmountNgn)}`
      );
    });

    doc.moveDown(1);
    doc.fontSize(11).text(`Subtotal: NGN ${formatNairaAmount(params.subtotalNgn)}`);
    doc.text(`VAT (${(VAT_RATE * 100).toFixed(1)}%): NGN ${formatNairaAmount(params.vatNgn)}`);
    doc.fontSize(13).text(`Grand Total: NGN ${formatNairaAmount(params.totalNgn)}`, { underline: true });
    if (params.notes) {
      doc.moveDown(1);
      doc.fontSize(10).text(`Notes: ${params.notes}`);
    }
    doc.moveDown(1);
    doc.fontSize(9).text('Shoouts Finance • This document is system generated.', { align: 'left' });
    doc.end();
  });
}

export async function createInvoiceAndGetUrl(params: {
  userId: string;
  invoiceNumber: string;
  issuedTo: string;
  email: string;
  lineItems: InvoiceLine[];
  subtotalNgn: number;
  vatNgn: number;
  totalNgn: number;
  notes?: string;
}): Promise<string> {
  const buffer = await renderInvoicePdfBuffer({
    invoiceNumber: params.invoiceNumber,
    issuedTo: params.issuedTo,
    email: params.email,
    issuedAt: new Date(),
    lineItems: params.lineItems,
    subtotalNgn: params.subtotalNgn,
    vatNgn: params.vatNgn,
    totalNgn: params.totalNgn,
    notes: params.notes,
  });

  const filePath = invoiceStoragePath(params.userId, params.invoiceNumber);
  await storageRepo.saveFile(filePath, buffer, 'application/pdf');

  return storageRepo.getSignedUrl(filePath, 1000 * 60 * 60 * 24 * 30);
}

/**
 * Queues an email via the Trigger Email extension.
 */
export async function queueEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  await emailRepo.queueEmail(params);
}

/**
 * Creates a receipt (no VAT) and sends via email.
 * Use for payment confirmations where the charged amount is the total — no separate VAT line.
 */
export async function createReceiptEmail(params: {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  lineItems: InvoiceLine[];
  totalChargedNgn: number;
  subject: string;
  invoicePrefix?: string;
  notes?: string;
}): Promise<string> {
  const invoiceNumber = generateInvoiceNumber(params.invoicePrefix || 'RCT');

  const invoiceUrl = await createInvoiceAndGetUrl({
    userId: params.userId,
    invoiceNumber,
    issuedTo: params.recipientName,
    email: params.recipientEmail,
    lineItems: params.lineItems,
    subtotalNgn: params.totalChargedNgn,
    vatNgn: 0,
    totalNgn: params.totalChargedNgn,
    notes: params.notes,
  });

  await emailRepo.queueEmail({
    to: params.recipientEmail,
    subject: params.subject,
    text: `Hi ${params.recipientName}, ${params.subject}. Receipt: ${invoiceUrl}`,
    html: `<p>Hi ${params.recipientName},</p><p>${params.subject}.</p><p>Receipt: <a href="${invoiceUrl}">Download PDF receipt</a></p>`,
  });

  return invoiceUrl;
}

/**
 * Creates an invoice WITH VAT and sends via email.
 * Use only when VAT is actually included in the charged amount.
 */
export async function createInvoiceAndSendEmail(params: {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  lineItems: InvoiceLine[];
  subject: string;
  invoicePrefix?: string;
  notes?: string;
}): Promise<string> {
  const subtotal = params.lineItems.reduce((sum, line) => sum + line.totalAmountNgn, 0);
  const vat = calculateVat(subtotal);
  const total = subtotal + vat;
  const invoiceNumber = generateInvoiceNumber(params.invoicePrefix || 'INV');

  const invoiceUrl = await createInvoiceAndGetUrl({
    userId: params.userId,
    invoiceNumber,
    issuedTo: params.recipientName,
    email: params.recipientEmail,
    lineItems: params.lineItems,
    subtotalNgn: subtotal,
    vatNgn: vat,
    totalNgn: total,
    notes: params.notes,
  });

  await emailRepo.queueEmail({
    to: params.recipientEmail,
    subject: params.subject,
    text: `Hi ${params.recipientName}, ${params.subject}. Invoice: ${invoiceUrl}`,
    html: `<p>Hi ${params.recipientName},</p><p>${params.subject}.</p><p>Invoice: <a href="${invoiceUrl}">Download PDF invoice</a></p>`,
  });

  return invoiceUrl;
}
