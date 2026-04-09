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
exports.createReceiptEmail = createReceiptEmail;
exports.createInvoiceAndSendEmail = createInvoiceAndSendEmail;
const pdfkit_1 = __importDefault(require("pdfkit"));
const types_1 = require("../types");
const repositories_1 = require("../repositories");
const formatting_1 = require("../utils/formatting");
const subscriptionLifecycle_1 = require("../subscriptionLifecycle");
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
            doc.fontSize(10).text(`${line.description}  | Qty: ${line.qty}  | Unit: NGN ${(0, formatting_1.formatNairaAmount)(line.unitAmountNgn)}  | Total: NGN ${(0, formatting_1.formatNairaAmount)(line.totalAmountNgn)}`);
        });
        doc.moveDown(1);
        doc.fontSize(11).text(`Subtotal: NGN ${(0, formatting_1.formatNairaAmount)(params.subtotalNgn)}`);
        doc.text(`VAT (${(types_1.VAT_RATE * 100).toFixed(1)}%): NGN ${(0, formatting_1.formatNairaAmount)(params.vatNgn)}`);
        doc.fontSize(13).text(`Grand Total: NGN ${(0, formatting_1.formatNairaAmount)(params.totalNgn)}`, { underline: true });
        if (params.notes) {
            doc.moveDown(1);
            doc.fontSize(10).text(`Notes: ${params.notes}`);
        }
        doc.moveDown(1);
        doc.fontSize(9).text('Shoouts Finance • This document is system generated.', { align: 'left' });
        doc.end();
    });
}
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
    const filePath = (0, subscriptionLifecycle_1.invoiceStoragePath)(params.userId, params.invoiceNumber);
    await repositories_1.storageRepo.saveFile(filePath, buffer, 'application/pdf');
    return repositories_1.storageRepo.getSignedUrl(filePath, 1000 * 60 * 60 * 24 * 30);
}
/**
 * Queues an email via the Trigger Email extension.
 */
async function queueEmail(params) {
    await repositories_1.emailRepo.queueEmail(params);
}
/**
 * Creates a receipt (no VAT) and sends via email.
 * Use for payment confirmations where the charged amount is the total — no separate VAT line.
 */
async function createReceiptEmail(params) {
    const invoiceNumber = (0, formatting_1.generateInvoiceNumber)(params.invoicePrefix || 'RCT');
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
    await repositories_1.emailRepo.queueEmail({
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
async function createInvoiceAndSendEmail(params) {
    const subtotal = params.lineItems.reduce((sum, line) => sum + line.totalAmountNgn, 0);
    const vat = (0, formatting_1.calculateVat)(subtotal);
    const total = subtotal + vat;
    const invoiceNumber = (0, formatting_1.generateInvoiceNumber)(params.invoicePrefix || 'INV');
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
    await repositories_1.emailRepo.queueEmail({
        to: params.recipientEmail,
        subject: params.subject,
        text: `Hi ${params.recipientName}, ${params.subject}. Invoice: ${invoiceUrl}`,
        html: `<p>Hi ${params.recipientName},</p><p>${params.subject}.</p><p>Invoice: <a href="${invoiceUrl}">Download PDF invoice</a></p>`,
    });
    return invoiceUrl;
}
