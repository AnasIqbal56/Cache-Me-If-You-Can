import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/Apierror.js";
import { Product } from "../models/product.models.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Order } from "../models/order.models.js";
import { Auditlog } from "../models/auditlog.models.js";
import stripe from "../config/stripe.js";

// ESCROW NOT SURE IN THIS SOME WORK NEEDED HERE
// basic logic with Auditlog done
// ______________________________HAVE TO DISCUSS SOME LOGIC WITH TEAM
const createOrder = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;
  const productId = req.body.productId;
  const paymentMethodId = req.body.paymentMethodId;

  if (!(buyerId && productId && paymentMethodId)) {
    throw new APIError(400, "Missing required fields");
  }

  const buyerIdchk = await User.findById(buyerId).select("_id email");
  if (!buyerIdchk) {
    throw new APIError(404, "Buyer Not Found or Not Registered");
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new APIError(400, "Invalid productId");
  }

  const product = await Product.findById(productId).select(
    "price sellerId condition name",
  );
  if (!product) {
    throw new APIError(404, "Product Not Found");
  }
  const sellerId = product.sellerId?.toString();
    
  const amount = product.price;
  const shippingProvider = null;
  const trackingId = null;

  try {
    // Get seller's Stripe account ID
    const seller = await User.findById(sellerId).select("stripeAccountId");
    if (!seller?.stripeAccountId) {
      throw new APIError(400, "Seller is not set up to receive payments");
    }

    // Calculate platform fee (e.g., 10%)
    const platformFeePercent = 10;
    const platformFeeAmount = Math.round((amount * platformFeePercent) / 100);
    const sellerAmount = Math.round(amount * 100) - platformFeeAmount; // Convert to cents

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      application_fee_amount: platformFeeAmount,
      transfer_data: {
        destination: seller.stripeAccountId,
      },
      description: `Payment for ${product.name}`,
      metadata: {
        productId: productId,
        buyerId: buyerId,
        sellerId: sellerId,
        sellerAmount: sellerAmount,
        platformFee: platformFeeAmount
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new APIError(400, "Payment failed");
    }

    // Create order after successful payment
    const createdOrder = await Order.create({
      buyerId,
      sellerId,
      productId,
      status: "processing",
      amount,
      escrowRelease: false,
      shippingProvider,
      trackingId,
      stripePaymentIntentId: paymentIntent.id
    });

    if (!createdOrder) {
      // Refund the payment if order creation fails
      await stripe.refunds.create({
        payment_intent: paymentIntent.id
      });
      throw new APIError(500, "Something Went Wrong in Order Creation");
    }

    await Auditlog.create({
      OrderId: createdOrder._id,
      amount: createdOrder.amount,
      userId: buyerId,
      sellerId: sellerId,
      Action: "Order Created",
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Order Created Successfully", createdOrder));
  } catch (error) {
    if (error.type === 'StripeCardError') {
      throw new APIError(400, error.message);
    }
    throw error;
  }
});

//     const Selleridchk = product.sellerId?.toString();
//     if (!Selleridchk){
//         throw new APIError(404, "Seller Not Found for this Product");
//     }

//     // if (sellerId !== Selleridchk) {
//     //     throw new APIError(400, "SellerId does not match with product's sellerId");
//     // }

//     const Order = await Order.create({
//         buyerId,
//         sellerId,
//         productId,
//         status: "pending",
//         amount,
//         escrowRelease: false,
//         shippingProvider,
//         trackingId,
//     })
//     if (!Order) {
//         throw new APIError(500, "Something Went Wrong in Order Creation");
//     }
//     return res.status(201).json(new ApiResponse(201, "Order Created Successfully", Order));
// });

const getOrderById = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const buyerId = req.user._id;

  if (!(orderId && buyerId)) {
    throw new APIError(400, "Something Went Wrong, Try Refresing Page");
  }
  const order = await Order.findOne({ _id: order });
  if (!order) {
    throw new APIError(404, "Order Not Found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Order Fetched Successfully", order));
});

// Working ( NOT TESTED FOR MULTIPLE CASES)
const cancelOrder = asyncHandler(async (req, res) => {
  const OrderId = req.params.id;
  const buyerId = req.user._id;

  if (!(OrderId && buyerId)) {
    throw new APIError(400, "Something Went Wrong, Try Refresing Page");
  }
  
  const order = await Order.findById(OrderId);

  if (!order) {
    throw new APIError(404, "Order Not Found or Can't be cancelled");
  }

  if (order.status !== "processing") {
    throw new APIError(400, "Only processing orders can be cancelled");
  }

  try {
    // Refund the payment through Stripe
    if (order.stripePaymentIntentId) {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripePaymentIntentId,
        reason: 'requested_by_customer'
      });

      if (refund.status !== 'succeeded') {
        throw new APIError(500, "Failed to process refund");
      }
    }

    // Update order status to cancelled
    const updatedOrder = await Order.findByIdAndUpdate(
      OrderId,
      { 
        status: "cancelled",
        refundId: refund?.id
      },
      { new: true }
    );

    await Auditlog.create({
      OrderId: order._id,
      userId: buyerId,
      sellerId: order.sellerId,
      action: "Order Cancelled and Refunded",
      amount: order.amount,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, "Order Cancelled and Refunded Successfully", updatedOrder));
  } catch (error) {
    if (error.type === 'StripeError') {
      throw new APIError(500, "Failed to process refund: " + error.message);
    }
    throw error;
  }
});

// UNFINISHED
// Not Tested NO ADMIN RN
const updateOrder = asyncHandler(async (req, res) => {
  const orderId = req.params.id;
  const adminId = req.user._id;
  const {status} = req.body;

  const admincheck = await User.findById(adminId).select("role");
  if (admincheck.role !== "admin") {
    throw new APIError(403, "You are not authorized to perform this action");
  }

  if (!(orderId && adminId)) {
    throw new APIError(400, "Something Went Wrong with Auth, Try Refresing Page");
  }

  const Order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: status,
    },
    req.body,
    { new: true },
  );

  if (!Order) {
    throw new APIError(404, "Order Not Found or Can't be updated");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Order Updated Successfully", Order));
});

// Working
const getOrdersByUser = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;

  if (!buyerId) {
    throw new APIError(400, "Something Went Wrong, Try Refresing Page");
  }

  const orders = await Order.find({ buyerId: buyerId });
  return res
    .status(200)
    .json(new ApiResponse(200, "Orders Fetched Successfully", orders));
});

// Working
const getOrdersBySeller = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  if (!sellerId) {
    throw new APIError(400, "Authentication Error", null);
  }

  const orders = await Order.findOne({
    sellerId,
  });

  if (!orders) {
    throw new APIError(404, "No Orders Found for this Seller", null);
  }

  res
    .status(200)
    .json(new ApiResponse(200, "Orders Fetched Successfully", orders));
});

// UNFINISHED
const HoldinEscrow = asyncHandler(async (req, res) => {});
//
const releaseEscrow = asyncHandler(async (req, res) => {});
//
const refundOrder = asyncHandler(async (req, res) => {});

const raiseDispute = asyncHandler(async (req, res) => {
    const buyerId = req.user._id;
    const orderId = req.params.id;
    const { reason } = req.body;

    if (!(buyerId && orderId)) {
        throw new APIError(400, "Authentication Error, Try Refresing Page OR Login Again");
    }
    if (!reason){
        throw new APIError(400, "Dispute reason is required");
    }

    const order = await Order.findById(orderId);
    if (!order) {
        throw new APIError(404, "Order Not Found");
    }
    if (order.buyerId.toString() !== buyerId.toString()) {
        throw new APIError(403, "You are not authorized to raise dispute for this order");
    }
    await Order.findByIdAndUpdate(orderId,
        { status: "disputed" },
        { new: true });
    await Auditlog.create({
        OrderId: orderId,
        userId: buyerId,
        action: "Dispute Raised",
        Amount: order.amount,
    });
    return res.status(200).json(new ApiResponse(200, "Dispute Raised Successfully"),null);
});


// const LogOrderAction = asyncHandler(async (req, res) => {
//   const OrderId = req.params._id;
//   const UserId = req.user._id;

//   if (!(OrderId || UserId)) {
//     throw new APIError(400, "Authentication Error");
//   }
//   const Action = "Order Placed";
//   const Auditlog = await Auditlog.Create({
//     OrderId,
//     UserId,
//     Action,
//     Amount: mongoose.Types.ObjectId(OrderId),
//   });
//   return res
//     .status(201)
//     .json(new ApiResponse(201, "Order Action Logged Successfully", {}));
// });

export {
  createOrder,
  getOrderById,
  cancelOrder,
  updateOrder,
  raiseDispute,
  getOrdersByUser,
  getOrdersBySeller,
  HoldinEscrow,
  releaseEscrow,
  refundOrder,
  //LogOrderAction,
};
