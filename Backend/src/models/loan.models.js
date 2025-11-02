import mongoose, { Schema } from "mongoose";

const loanSchema = new Schema(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    loanType: {
      type: String,
      required: true,
      enum: [
        "Agricultural Equipment",
        "Crop Production",
        "Livestock",
        "Land Purchase",
        "Irrigation System",
        "Storage Facility",
        "Working Capital",
        "Other",
      ],
    },
    amount: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    farmSize: {
      type: Number,
      required: true,
    },
    annualIncome: {
      type: Number,
      required: true,
    },
    collateral: {
      type: String,
      required: true,
    },
    cnicNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "under-review", "approved", "rejected", "disbursed"],
      default: "pending",
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    approvalNotes: {
      type: String,
    },
    disbursementDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

export const Loan = mongoose.model("Loan", loanSchema);
