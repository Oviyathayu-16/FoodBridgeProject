const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    foodName: { type: String, required: true, trim: true },
    foodType: {
      type: String,
      enum: ["veg", "non-veg", "bakery", "packaged", "other"],
      default: "veg",
    },
    quantity: { type: String, required: true }, // e.g. "10 kg", "25 plates"
    expiryTime: { type: Date, required: true }, // best-before / consume-by time
    pickupAddress: { type: String, required: true },
    contactNumber: { type: String, required: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ["available", "requested", "picked_up", "expired", "cancelled"],
      default: "available",
    },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    requestedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
  },
  { timestamps: true }
);


// Convenience: mark expired donations automatically when queried
donationSchema.methods.isExpired = function () {
  return this.expiryTime < new Date() && this.status === "available";
};

module.exports = mongoose.model("Donation", donationSchema);
