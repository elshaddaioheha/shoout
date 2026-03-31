/**
 * Invoicing service - PDF generation, storage, and email queueing
 */

import * as admin from 'firebase-admin';
import PDFDocument from 'pdfkit';
import { InvoiceLine, EMAIL_COLLECTION, NAIRA_RATE } from '../types';
import { getDb, getStorage, serverTimestamp } from '../utils/firebase';
import { calculateVat, formatNairaAmount, generateInvoiceNumber } from '../utils/formatting';
import {
  buildMailQueuePayload,
  invoiceStoragePath,
} from '../subscriptionLifecycle';

/**
 * Renders an invoice PDF as a Buffer
 */
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
      doc
        .fontSize(10)
        .text(
          `${line.description}  | Qty: ${line.qty}  | Unit: NGN ${formatNairaAmount(line.unitAmountNgn)}  | Total: NGN ${formatNairaAmount(line.totalAmountNgn)}`
        );
    });

    doc.moveDown(1);
    doc.fontSize(11).text(`Subtotal: NGN ${formatNairaAmount(params.subtotalNgn)}`);
    doc.text(`VAT (7.5%): NGN ${formatNairaAmount(params.vatNgn)}`);
    doc
      .fontSize(13)
      .text(`Grand Total: NGN ${formatNairaAmount(params.totalNgn)}`, { underline: true });
    if (params.notes) {
      doc.moveDown(1);
      doc.fontSize(10).text(`Notes: ${params.notes}`);
    }
    doc.moveDown(1);
    doc
      .fontSize(9)
      .text('Shoouts Finance • This document is system generated.', { align: 'left' });
    doc.end();
  });
}

/**
 * Uploads invoice PDF to Cloud Storage and returns signed URL
 */
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

  const storage = getStorage();
  const bucket = storage.bucket();
  const filePath = invoiceStoragePath(params.userId, params.invoiceNumber);
  const file = bucket.file(filePath);

  await file.save(buffer, {
    resumable: false,
    contentType: 'application/pdf',
    metadata: { cacheControl: 'private, max-age=3600' },
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });

  return signedUrl;
}

/**
 * Queues an email for sending via Firestore Send Email extension
 */
export async function queueEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const db = getDb();
  await db.collection(EMAIL_COLLECTION).add({
    ...buildMailQueuePayload(params),
    createdAt: serverTimestamp(),
  });
}

/**
 * Creates invoice and sends it via email (end-to-end)
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

  // Generate PDF and get signed URL
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

  // Queue email notification
  await queueEmail({
    to: params.recipientEmail,
    subject: params.subject,
    text: `Hi ${params.recipientName}, ${params.subject}. Invoice: ${invoiceUrl}`,
    html: `<p>Hi ${params.recipientName},</p><p>${params.subject}.</p><p>Invoice: <a href="${invoiceUrl}">Download PDF invoice</a></p>`,
  });

  return invoiceUrl;
}
