import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data", "db.json");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

function loadDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function saveDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function rentalDays(start, end) {
  const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return days;
}

function makeOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/v1/assets/catalog", (req, res) => {
  const db = loadDb();
  const { category, city, status, q } = req.query;

  let assets = db.assets;
  if (category) assets = assets.filter((a) => a.category === category);
  if (city) assets = assets.filter((a) => a.city === city);
  if (status) assets = assets.filter((a) => a.status === status);
  if (q) assets = assets.filter((a) => a.asset_name.toLowerCase().includes(String(q).toLowerCase()));

  res.json(assets);
});

app.get("/api/v1/assets/:assetId", (req, res) => {
  const db = loadDb();
  const asset = db.assets.find((a) => a.asset_id === Number(req.params.assetId));
  if (!asset) return res.status(404).json({ message: "Asset not found" });
  res.json(asset);
});

app.post("/api/v1/assets", (req, res) => {
  const db = loadDb();
  const {
    owner_id = 999,
    owner_name = "Current User",
    owner_rating = 5,
    owner_total_listings = 1,
    asset_name,
    category,
    description,
    condition,
    daily_rate,
    security_deposit,
    pickup_location,
    city,
    requires_advance_booking = false,
    specifications = [],
    included_accessories = [],
    images = [],
  } = req.body;

  if (!asset_name || !category || !description || !condition || !daily_rate || security_deposit === undefined || !pickup_location || !city) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const asset = {
    asset_id: db.nextIds.asset++,
    owner_id: Number(owner_id),
    owner_name,
    owner_rating: Number(owner_rating),
    owner_total_listings: Number(owner_total_listings),
    asset_name,
    category,
    description,
    condition,
    daily_rate: Number(daily_rate),
    security_deposit: Number(security_deposit),
    pickup_location,
    city,
    status: "Available",
    requires_advance_booking: Boolean(requires_advance_booking),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    specifications,
    included_accessories,
    images,
  };

  db.assets.unshift(asset);
  saveDb(db);
  res.status(201).json(asset);
});

app.get("/api/v1/assets/:assetId/availability", (req, res) => {
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date) {
    return res.status(400).json({ message: "start_date and end_date are required" });
  }

  const db = loadDb();
  const conflicts = db.bookings.filter(
    (b) =>
      b.asset_id === Number(req.params.assetId) &&
      ["Confirmed", "Active"].includes(b.booking_status) &&
      overlap(start_date, end_date, b.start_date, b.end_date),
  );

  res.json({ available: conflicts.length === 0, conflicting_bookings: conflicts });
});

app.post("/api/v1/bookings/create", (req, res) => {
  const { asset_id, renter_id = 777, start_date, end_date } = req.body;
  if (!asset_id || !start_date || !end_date) {
    return res.status(400).json({ message: "asset_id, start_date and end_date are required" });
  }

  const days = rentalDays(start_date, end_date);
  if (days <= 0) return res.status(400).json({ message: "end_date must be after start_date" });

  const db = loadDb();
  const asset = db.assets.find((a) => a.asset_id === Number(asset_id));
  if (!asset) return res.status(404).json({ message: "Asset not found" });

  const conflicts = db.bookings.filter(
    (b) =>
      b.asset_id === Number(asset_id) &&
      ["Confirmed", "Active"].includes(b.booking_status) &&
      overlap(start_date, end_date, b.start_date, b.end_date),
  );
  if (conflicts.length) return res.status(409).json({ message: "Asset unavailable for selected dates" });

  const total_rental_amount = Number(asset.daily_rate) * days;
  const total_amount = total_rental_amount + Number(asset.security_deposit);

  const booking = {
    booking_id: db.nextIds.booking++,
    asset_id: Number(asset_id),
    renter_id: Number(renter_id),
    owner_id: asset.owner_id,
    start_date,
    end_date,
    rental_days: days,
    daily_rate: Number(asset.daily_rate),
    total_rental_amount,
    security_deposit: Number(asset.security_deposit),
    total_amount,
    escrow_transaction_id: null,
    booking_status: "Pending",
    pickup_verified_at: null,
    return_verified_at: null,
    created_at: new Date().toISOString(),
  };

  db.bookings.push(booking);
  saveDb(db);

  res.status(201).json({ booking_id: booking.booking_id, escrow_amount_required: total_amount, booking });
});

app.put("/api/v1/bookings/:bookingId/confirm-payment", (req, res) => {
  const { escrow_transaction_id } = req.body;
  const db = loadDb();
  const booking = db.bookings.find((b) => b.booking_id === Number(req.params.bookingId));
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.escrow_transaction_id = escrow_transaction_id || `ESC-${Date.now()}`;
  booking.booking_status = "Confirmed";
  saveDb(db);
  res.json({ message: "Booking payment confirmed", booking });
});

app.post("/api/v1/handover/pickup/initiate", (req, res) => {
  const { booking_id, verification_method = "OTP" } = req.body;
  const db = loadDb();
  const booking = db.bookings.find((b) => b.booking_id === Number(booking_id));
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const handover = {
    handover_id: db.nextIds.handover++,
    booking_id: booking.booking_id,
    handover_type: "Pickup",
    verification_method,
    qr_code_data: verification_method === "QR_Code" ? `EQUIPHUB:${booking.booking_id}:${Date.now()}` : null,
    otp_code: verification_method === "OTP" ? makeOtp() : null,
    otp_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    verified_by: null,
    verified_at: null,
    verification_status: "Pending",
    created_at: new Date().toISOString(),
  };

  db.handoverRecords.push(handover);
  saveDb(db);
  res.status(201).json(handover);
});

app.post("/api/v1/handover/verify", (req, res) => {
  const { handover_id, verification_code, verified_by = 0 } = req.body;
  const db = loadDb();

  const handover = db.handoverRecords.find((h) => h.handover_id === Number(handover_id));
  if (!handover) return res.status(404).json({ message: "Handover record not found" });

  if (handover.verification_method === "OTP" && handover.otp_code !== verification_code) {
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (handover.otp_expires_at && new Date(handover.otp_expires_at) < new Date()) {
    handover.verification_status = "Expired";
    saveDb(db);
    return res.status(400).json({ message: "OTP expired" });
  }

  handover.verification_status = "Verified";
  handover.verified_by = Number(verified_by);
  handover.verified_at = new Date().toISOString();

  const booking = db.bookings.find((b) => b.booking_id === handover.booking_id);
  const asset = db.assets.find((a) => a.asset_id === booking.asset_id);

  if (handover.handover_type === "Pickup") {
    booking.booking_status = "Active";
    booking.pickup_verified_at = handover.verified_at;
    asset.status = "Rented";
  } else {
    booking.booking_status = "Completed";
    booking.return_verified_at = handover.verified_at;
    asset.status = "Available";
  }

  saveDb(db);
  res.json({ message: "Handover verified", handover, booking, asset });
});

app.post("/api/v1/handover/return/complete", (req, res) => {
  const { booking_id, condition_photos = [] } = req.body;
  const db = loadDb();
  const booking = db.bookings.find((b) => b.booking_id === Number(booking_id));
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  const handover = {
    handover_id: db.nextIds.handover++,
    booking_id: booking.booking_id,
    handover_type: "Return",
    verification_method: "OTP",
    qr_code_data: null,
    otp_code: makeOtp(),
    otp_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    verified_by: null,
    verified_at: null,
    verification_status: "Pending",
    created_at: new Date().toISOString(),
  };

  db.handoverRecords.push(handover);

  condition_photos.forEach((url, idx) => {
    db.conditionPhotos.push({
      photo_id: db.nextIds.photo++,
      handover_id: handover.handover_id,
      photo_type: ["Front_View", "Back_View", "Accessories", "Serial_Number"][idx] || "Front_View",
      image_url: url,
      uploaded_at: new Date().toISOString(),
    });
  });

  saveDb(db);
  res.status(201).json({ message: "Return initiated", handover });
});

app.get("/api/v1/rentals", (req, res) => {
  const userId = Number(req.query.user_id || 777);
  const db = loadDb();

  const enrich = (b) => {
    const asset = db.assets.find((a) => a.asset_id === b.asset_id);
    return {
      id: b.booking_id,
      assetName: asset?.asset_name,
      owner: asset?.owner_name,
      renter: `User ${b.renter_id}`,
      startDate: b.start_date,
      endDate: b.end_date,
      status: b.booking_status,
      dailyRate: b.daily_rate,
      totalPaid: b.total_amount,
      totalEarning: b.total_rental_amount,
      location: asset?.pickup_location,
      bookingId: b.booking_id,
    };
  };

  const asRenter = db.bookings.filter((b) => b.renter_id === userId).map(enrich);
  const asOwner = db.bookings.filter((b) => b.owner_id === userId).map(enrich);
  res.json({ asRenter, asOwner });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`EquipHub backend running on http://localhost:${port}`);
});
