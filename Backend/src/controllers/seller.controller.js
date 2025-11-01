import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/Apierror.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import stripe from "../config/stripe.js";

// Create Stripe Connect account for seller
const createSellerStripeAccount = asyncHandler(async (req, res) => {
    const sellerId = req.user._id;
    const { email, country } = req.body;

    // Check if seller already has a Stripe account
    const seller = await User.findById(sellerId);
    if (seller.stripeAccountId) {
        throw new APIError(400, "Seller already has a Stripe account");
    }

    try {
        // Create a Stripe Connect account
        const account = await stripe.accounts.create({
            type: 'express',
            country: country,
            email: email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
            business_type: 'individual',
        });

        // Update user with Stripe account ID
        await User.findByIdAndUpdate(sellerId, {
            stripeAccountId: account.id,
            stripeAccountStatus: account.capabilities
        });

        // Generate account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.FRONTEND_URL}/seller/stripe/refresh`,
            return_url: `${process.env.FRONTEND_URL}/seller/stripe/success`,
            type: 'account_onboarding',
        });

        return res.status(200).json(
            new ApiResponse(200, "Stripe account created", {
                accountLink: accountLink.url
            })
        );
    } catch (error) {
        throw new APIError(500, "Error creating Stripe account: " + error.message);
    }
});

// Get seller's Stripe account status
const getSellerStripeStatus = asyncHandler(async (req, res) => {
    const sellerId = req.user._id;
    
    const seller = await User.findById(sellerId);
    if (!seller.stripeAccountId) {
        throw new APIError(404, "Stripe account not found");
    }

    const account = await stripe.accounts.retrieve(seller.stripeAccountId);
    
    return res.status(200).json(
        new ApiResponse(200, "Stripe account status retrieved", {
            accountStatus: account.capabilities,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled
        })
    );
});

export {
    createSellerStripeAccount,
    getSellerStripeStatus
};