import { asyncHandler } from "../utils/asyncHandler";
import Payment from "../models/payment.model.js";

export const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
});

export const getPaymentById = asyncHandler(async (req, res) => {
  
    const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }
  res.json(payment);
});

export const createPayment = asyncHandler(async (req, res) => {
    const { amount, method, status, orderId } = req.body;

    const payment = new Payment({
        amount,
        method,
        status,
        orderId // Payment against the order
    });

    await payment.save();
    res.status(201).json(payment);
});

export const updatePayment = asyncHandler(async (req, res) => {
    const { amount, method, status } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
    }
    payment.amount = amount !== undefined ? amount : payment.amount;
    payment.method = method !== undefined ? method : payment.method;
    payment.status = status !== undefined ? status : payment.status;
    await payment.save();
    res.json(payment);
});

export const deletePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
    }
    await payment.remove();
    res.json({ message: "Payment deleted successfully" });
});