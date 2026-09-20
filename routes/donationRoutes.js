const express = require("express");
const Donation = require("../models/Donation");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// @route   POST /api/donations
// @desc    Donor registers surplus food
router.post("/", protect, authorize("donor", "ngo", "admin"), async (req, res) => {
  try {
    const { foodName, foodType, quantity, expiryTime, pickupAddress, contactNumber, notes } = req.body;

    if (!foodName || !quantity || !expiryTime || !pickupAddress || !contactNumber) {
      return res.status(400).json({ message: "Missing required donation fields" });
    }

    const donation = await Donation.create({
      donor: req.user.id,
      foodName,
      foodType,
      quantity,
      expiryTime,
      pickupAddress,
      contactNumber,
      notes,
    });

    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ message: "Could not create donation", error: err.message });
  }
});

// @route   GET /api/donations
// @desc    List donations (filter by status), auto-expire stale ones
router.get("/", protect, async (req, res) => {
  try {
    const { status } = req.query;

    // auto-mark expired
    await Donation.updateMany(
      { status: "available", expiryTime: { $lt: new Date() } },
      { $set: { status: "expired" } }
    );

    const filter = status ? { status } : {};
    const donations = await Donation.find(filter)
      .populate("donor", "name organizationName phone")
      .populate("volunteer", "name phone")
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch donations", error: err.message });
  }
});

// @route   GET /api/donations/mine
// @desc    Donation history for the logged-in donor or volunteer
router.get("/mine", protect, async (req, res) => {
  try {
    const query =
      req.user.role === "volunteer" || req.user.role === "ngo"
        ? { volunteer: req.user.id }
        : { donor: req.user.id };

    const donations = await Donation.find(query).sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch history", error: err.message });
  }
});

// @route   PUT /api/donations/:id/request
// @desc    Volunteer/NGO requests pickup of a donation
router.put("/:id/request", protect, authorize("volunteer", "ngo", "admin"), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status !== "available") {
      return res.status(400).json({ message: `Donation is already ${donation.status}` });
    }

    donation.status = "requested";
    donation.volunteer = req.user.id;
    donation.requestedAt = new Date();
    await donation.save();

    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: "Could not request pickup", error: err.message });
  }
});

// @route   PUT /api/donations/:id/complete
// @desc    Mark a donation as picked up (rescued)
router.put("/:id/complete", protect, authorize("volunteer", "ngo", "admin"), async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    donation.status = "picked_up";
    donation.pickedUpAt = new Date();
    await donation.save();

    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: "Could not complete pickup", error: err.message });
  }
});

// @route   PUT /api/donations/:id/cancel
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    donation.status = "cancelled";
    await donation.save();

    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: "Could not cancel donation", error: err.message });
  }
});

// @route   GET /api/donations/dashboard
// @desc    Aggregate stats for the dashboard
router.get("/stats/dashboard", protect, async (req, res) => {
  try {
    const [totalDonations, foodRescued, pendingPickups, activeVolunteers] = await Promise.all([
      Donation.countDocuments({}),
      Donation.countDocuments({ status: "picked_up" }),
      Donation.countDocuments({ status: "requested" }),
      require("../models/User").countDocuments({ role: "volunteer", isActive: true }),
    ]);

    res.json({ totalDonations, foodRescued, pendingPickups, activeVolunteers });
  } catch (err) {
    res.status(500).json({ message: "Could not load dashboard stats", error: err.message });
  }
});

module.exports = router;
