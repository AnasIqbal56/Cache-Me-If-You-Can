import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/Apierror.js";
import { Product } from "../models/product.models.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Order } from "../models/order.models.js";
import { Auditlog } from "../models/auditlog.models.js";
import stripe from "../config/stripe.js";

// Create order with multiple products
const createOrder = asyncHandler(async (req, res) => {
  const buyerId = req.user._id;
  const { products, shippingAddress, paymentMethodId } = req.body;

  console.log("📦 Creating order for buyer:", buyerId);
  console.log("📦 Products:", products);

  if (!buyerId) {
    throw new APIError(401, "Authentication required");
  }

  if (!products || products.length === 0) {
    throw new APIError(400, "Cart is empty");
  }

  if (!shippingAddress) {
    throw new APIError(400, "Shipping address is required");
  }

  // Verify buyer exists
  const buyer = await User.findById(buyerId).select("_id email");
  if (!buyer) {
    throw new APIError(404, "Buyer Not Found");
  }

  // Validate and fetch product details
  let totalAmount = 0;
  const orderProducts = [];

  for (const item of products) {
    if (!mongoose.Types.ObjectId.isValid(item.productId)) {
      throw new APIError(400, `Invalid productId: ${item.productId}`);
    }

    const product = await Product.findById(item.productId).select("price sellerId title");
    if (!product) {
      throw new APIError(404, `Product not found: ${item.productId}`);
    }

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    orderProducts.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      sellerId: product.sellerId,
    });
  }

  console.log(`💰 Total amount: ₹${totalAmount}`);

  // Create order without payment for now (can add Stripe later)
  const createdOrder = await Order.create({
    buyerId,
    products: orderProducts,
    status: "pending",
    totalAmount,
    paymentStatus: "pending",
    shippingAddress,
  });

  if (!createdOrder) {
    throw new APIError(500, "Failed to create order");
  }

  console.log("✅ Order created:", createdOrder._id);

  // Create audit logs for each seller
  const sellers = [...new Set(orderProducts.map(p => p.sellerId.toString()))];
  for (const sellerId of sellers) {
    await Auditlog.create({
      OrderId: createdOrder._id,
      amount: totalAmount, // Can be refined to seller-specific amount
      userId: buyerId,
      sellerId: sellerId,
      Action: "Order Created",
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "Order Created Successfully", createdOrder));
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

// Get orders for a seller
const getOrdersBySeller = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;

  if (!sellerId) {
    throw new APIError(401, "Authentication Error");
  }

  console.log("📋 Fetching orders for seller:", sellerId);

  // Find all orders that contain products from this seller
  const orders = await Order.find({
    "products.sellerId": sellerId,
  })
    .populate("buyerId", "username phoneno")
    .populate("products.productId", "title images")
    .sort({ createdAt: -1 });

  // Calculate revenue statistics
  const totalRevenue = orders
    .filter(o => o.paymentStatus === "paid" && o.status === "completed")
    .reduce((sum, order) => {
      const sellerProducts = order.products.filter(
        p => p.sellerId.toString() === sellerId.toString()
      );
      return sum + sellerProducts.reduce((s, p) => s + (p.price * p.quantity), 0);
    }, 0);

  const pendingOrders = orders.filter(o => o.status === "pending").length;

  console.log(`✅ Found ${orders.length} orders for seller`);

  res.status(200).json(
    new ApiResponse(200, "Orders Fetched Successfully", {
      orders,
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        pendingOrders,
      },
    })
  );
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
