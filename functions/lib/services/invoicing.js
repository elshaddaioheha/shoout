"use strict";
/**
 * Invoicing service - PDF generation, storage, and email queueing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInvoicePdfBuffer = renderInvoicePdfBuffer;
exports.createInvoiceAndGetUrl = createInvoiceAndGetUrl;
exports.queueEmail = queueEmail;
exports.createInvoiceAndSendEmail = createInvoiceAndSendEmail;
const pdfkit_1 = __importDefault(require("pdfkit"));
const types_1 = require("../types");
const firebase_1 = require("../utils/firebase");
const formatting_1 = require("../utils/formatting");
const subscriptionLifecycle_1 = require("../subscriptionLifecycle");
/**
 * Renders an invoice PDF as a Buffer
 */
async function renderInvoicePdfBuffer(params) {
    return new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
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
                .text(`${line.description}  | Qty: ${line.qty}  | Unit: NGN ${(0, formatting_1.formatNairaAmount)(line.unitAmountNgn)}  | Total: NGN ${(0, formatting_1.formatNairaAmount)(line.totalAmountNgn)}`);
        });
        doc.moveDown(1);
        doc.fontSize(11).text(`Subtotal: NGN ${(0, formatting_1.formatNairaAmount)(params.subtotalNgn)}`);
        doc.text(`VAT (7.5%): NGN ${(0, formatting_1.formatNairaAmount)(params.vatNgn)}`);
        doc
            .fontSize(13)
            .text(`Grand Total: NGN ${(0, formatting_1.formatNairaAmount)(params.totalNgn)}`, { underline: true });
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
async function createInvoiceAndGetUrl(params) {
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
    const storage = (0, firebase_1.getStorage)();
    const bucket = storage.bucket();
    const filePath = (0, subscriptionLifecycle_1.invoiceStoragePath)(params.userId, params.invoiceNumber);
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
async function queueEmail(params) {
    const db = (0, firebase_1.getDb)();
    await db.collection(types_1.EMAIL_COLLECTION).add({
        ...(0, subscriptionLifecycle_1.buildMailQueuePayload)(params),
        createdAt: (0, firebase_1.serverTimestamp)(),
    });
}
/**
 * Creates invoice and sends it via email (end-to-end)
 */
async function createInvoiceAndSendEmail(params) {
    const subtotal = params.lineItems.reduce((sum, line) => sum + line.totalAmountNgn, 0);
    const vat = (0, formatting_1.calculateVat)(subtotal);
    const total = subtotal + vat;
    const invoiceNumber = (0, formatting_1.generateInvoiceNumber)(params.invoicePrefix || 'INV');
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
