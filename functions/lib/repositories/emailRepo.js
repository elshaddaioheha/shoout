"use strict";
/**
 * Email repository — outbound mail queue for Trigger Email extension.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmail = queueEmail;
const types_1 = require("../types");
const base_1 = require("./base");
const subscriptionLifecycle_1 = require("../subscriptionLifecycle");
async function queueEmail(params) {
    await (0, base_1.getDb)().collection(types_1.EMAIL_COLLECTION).add({
        ...(0, subscriptionLifecycle_1.buildMailQueuePayload)(params),
        createdAt: (0, base_1.serverTimestamp)(),
    });
}
