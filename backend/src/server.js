import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { query } from "./db.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

const STATUS_TO_DB = {
  Pending: "pending",
  Confirmed: "confirmed",
  Active: "active",
  Completed: "completed",
  Cancelled: "cancelled",
  Disputed: "disputed",
};
const STATUS_FROM_DB = {
  pending: "Pending",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

function rentalDays(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
}

function makeOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function mapAsset(row) {
  return {
    asset_id: row.id,
    owner_id: row.owner_id,
    owner_name: row.owner_name || `User ${row.owner_id}`,
    owner_rating: Number(row.owner_rating || 5),
    owner_total_listings: Number(row.owner_total_listings || 1),
    asset_name: row.asset_name,
    category: row.category_name,
    description: row.description,
    condition: row.condition,
    daily_rate: Number(row.daily_rate),
    security_deposit: Number(row.security_deposit),
    pickup_location: row.pickup_location,
    city: row.city,
    status: row.status === "available" ? "Available" : "Rented",
    requires_advance_booking: row.requires_advance_booking,
    created_at: row.created_at,
    updated_at: row.updated_at,
    specifications: row.specifications || [],
    included_accessories: row.included_accessories || [],
    images: row.images || [],
  };
}

app.get("/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});

app.get("/api/v1/assets/catalog", async (req, res) => {
  const { category, city, status, q } = req.query;
  const values = [];
  const where = ["a.is_active = true"];

  if (category) {
    values.push(category);
    where.push(`c.category_name = $${values.length}`);
  }
  if (city) {
    values.push(city);
    where.push(`a.city = $${values.length}`);
  }
  if (status) {
    values.push(String(status).toLowerCase() === "available" ? "available" : "rented");
    where.push(`a.status = $${values.length}`);
  }
  if (q) {
    values.push(`%${String(q)}%`);
    where.push(`a.asset_name ILIKE $${values.length}`);
  }

  const sql = `
    SELECT a.*, c.category_name, u.display_name AS owner_name, p.average_rating AS owner_rating,
      (SELECT COUNT(*)::int FROM rental_assets ra WHERE ra.owner_id = a.owner_id AND ra.is_active = true) AS owner_total_listings,
      COALESCE((SELECT jsonb_agg(ai.image_url ORDER BY ai.upload_order) FROM asset_images ai WHERE ai.asset_id = a.id), '[]'::jsonb) AS images,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('spec_key', s.spec_key, 'spec_value', s.spec_value)) FROM asset_specifications s WHERE s.asset_id = a.id), '[]'::jsonb) AS specifications,
      '[]'::jsonb AS included_accessories
    FROM rental_assets a
    JOIN rental_asset_categories c ON c.id = a.category_id
    LEFT JOIN users u ON u.id = a.owner_id
    LEFT JOIN profiles p ON p.user_id = a.owner_id
    WHERE ${where.join(" AND ")}
    ORDER BY a.created_at DESC
  `;

  const { rows } = await query(sql, values);
  res.json(rows.map(mapAsset));
});

app.get("/api/v1/assets/:assetId", async (req, res) => {
  const { rows } = await query(
    `SELECT a.*, c.category_name, u.display_name AS owner_name, p.average_rating AS owner_rating,
      (SELECT COUNT(*)::int FROM rental_assets ra WHERE ra.owner_id = a.owner_id AND ra.is_active = true) AS owner_total_listings,
      COALESCE((SELECT jsonb_agg(ai.image_url ORDER BY ai.upload_order) FROM asset_images ai WHERE ai.asset_id = a.id), '[]'::jsonb) AS images,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('spec_key', s.spec_key, 'spec_value', s.spec_value)) FROM asset_specifications s WHERE s.asset_id = a.id), '[]'::jsonb) AS specifications,
      '[]'::jsonb AS included_accessories
     FROM rental_assets a
     JOIN rental_asset_categories c ON c.id = a.category_id
     LEFT JOIN users u ON u.id = a.owner_id
     LEFT JOIN profiles p ON p.user_id = a.owner_id
     WHERE a.id = $1 AND a.is_active = true`,
    [Number(req.params.assetId)],
  );
  if (!rows[0]) return res.status(404).json({ message: "Asset not found" });
  res.json(mapAsset(rows[0]));
});

app.post("/api/v1/assets", async (req, res) => {
  const {
    owner_id = 999,
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
    images = [],
  } = req.body;

  if (!asset_name || !category || !description || !condition || !daily_rate || security_deposit === undefined || !pickup_location || !city) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const cat = await query("SELECT id FROM rental_asset_categories WHERE category_name = $1", [category]);
  if (!cat.rows[0]) return res.status(400).json({ message: "Invalid category" });

  const inserted = await query(
    `INSERT INTO rental_assets (
      owner_id, asset_name, category_id, description, condition, daily_rate, security_deposit, pickup_location, city, status, requires_advance_booking
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'available',$10) RETURNING id`,
    [Number(owner_id), asset_name, cat.rows[0].id, description, condition, Number(daily_rate), Number(security_deposit), pickup_location, city, Boolean(requires_advance_booking)],
  );

  const assetId = inserted.rows[0].id;
  for (let i = 0; i < images.length; i += 1) {
    await query("INSERT INTO asset_images (asset_id, image_url, is_primary, upload_order) VALUES ($1,$2,$3,$4)", [assetId, images[i], i === 0, i + 1]);
  }
  for (const spec of specifications) {
    if (spec?.spec_key && spec?.spec_value) {
      await query("INSERT INTO asset_specifications (asset_id, spec_key, spec_value) VALUES ($1,$2,$3)", [assetId, spec.spec_key, spec.spec_value]);
    }
  }

  const { rows } = await query(
    `SELECT a.*, c.category_name, u.display_name AS owner_name, p.average_rating AS owner_rating, 1 AS owner_total_listings,
      COALESCE((SELECT jsonb_agg(ai.image_url ORDER BY ai.upload_order) FROM asset_images ai WHERE ai.asset_id = a.id), '[]'::jsonb) AS images,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('spec_key', s.spec_key, 'spec_value', s.spec_value)) FROM asset_specifications s WHERE s.asset_id = a.id), '[]'::jsonb) AS specifications,
      '[]'::jsonb AS included_accessories
     FROM rental_assets a
     JOIN rental_asset_categories c ON c.id = a.category_id
     LEFT JOIN users u ON u.id = a.owner_id
     LEFT JOIN profiles p ON p.user_id = a.owner_id
     WHERE a.id = $1`,
    [assetId],
  );
  res.status(201).json(mapAsset(rows[0]));
});

app.get("/api/v1/assets/:assetId/availability", async (req, res) => {
  const { start_date, end_date } = req.query;
  if (!start_date || !end_date) return res.status(400).json({ message: "start_date and end_date are required" });

  const { rows } = await query(
    `SELECT * FROM rental_bookings
     WHERE asset_id = $1
       AND booking_status IN ('confirmed', 'active')
       AND ($2::date <= end_date AND start_date <= $3::date)`,
    [Number(req.params.assetId), start_date, end_date],
  );

  res.json({
    available: rows.length === 0,
    conflicting_bookings: rows.map((b) => ({ ...b, booking_status: STATUS_FROM_DB[b.booking_status] || b.booking_status })),
  });
});

app.post("/api/v1/bookings/create", async (req, res) => {
  const { asset_id, renter_id = 777, start_date, end_date } = req.body;
  if (!asset_id || !start_date || !end_date) return res.status(400).json({ message: "asset_id, start_date and end_date are required" });

  const days = rentalDays(start_date, end_date);
  if (days <= 0) return res.status(400).json({ message: "end_date must be after start_date" });

  const asset = await query("SELECT * FROM rental_assets WHERE id = $1 AND is_active = true", [Number(asset_id)]);
  if (!asset.rows[0]) return res.status(404).json({ message: "Asset not found" });

  const conflicts = await query(
    `SELECT id FROM rental_bookings
     WHERE asset_id = $1 AND booking_status IN ('confirmed', 'active')
       AND ($2::date <= end_date AND start_date <= $3::date)`,
    [Number(asset_id), start_date, end_date],
  );
  if (conflicts.rows.length) return res.status(409).json({ message: "Asset unavailable for selected dates" });

  const total_rental_amount = Number(asset.rows[0].daily_rate) * days;
  const total_amount = total_rental_amount + Number(asset.rows[0].security_deposit);
  const created = await query(
    `INSERT INTO rental_bookings (
      asset_id, renter_id, owner_id, start_date, end_date, rental_days, daily_rate, total_rental_amount, security_deposit, total_amount, booking_status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending') RETURNING *`,
    [Number(asset_id), Number(renter_id), Number(asset.rows[0].owner_id), start_date, end_date, days, Number(asset.rows[0].daily_rate), total_rental_amount, Number(asset.rows[0].security_deposit), total_amount],
  );
  const booking = created.rows[0];
  res.status(201).json({ booking_id: booking.id, escrow_amount_required: total_amount, booking: { ...booking, booking_id: booking.id, booking_status: "Pending" } });
});

app.put("/api/v1/bookings/:bookingId/confirm-payment", async (req, res) => {
  const { escrow_transaction_id } = req.body;
  const tx = escrow_transaction_id || `ESC-${Date.now()}`;
  const updated = await query(
    "UPDATE rental_bookings SET escrow_transaction_id = $1, booking_status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
    [tx, Number(req.params.bookingId)],
  );
  if (!updated.rows[0]) return res.status(404).json({ message: "Booking not found" });
  res.json({ message: "Booking payment confirmed", booking: { ...updated.rows[0], booking_id: updated.rows[0].id, booking_status: "Confirmed" } });
});

app.post("/api/v1/handover/pickup/initiate", async (req, res) => {
  const { booking_id, verification_method = "OTP" } = req.body;
  const booking = await query("SELECT id FROM rental_bookings WHERE id = $1", [Number(booking_id)]);
  if (!booking.rows[0]) return res.status(404).json({ message: "Booking not found" });
  const method = verification_method === "QR_Code" ? "QR_Code" : "OTP";

  const created = await query(
    `INSERT INTO rental_handover_records (
      booking_id, handover_type, verification_method, qr_code_data, otp_code, otp_expires_at, verification_status, expires_at
     ) VALUES ($1,'Pickup',$2,$3,$4,NOW() + INTERVAL '30 minutes','pending',NOW() + INTERVAL '30 minutes') RETURNING *`,
    [Number(booking_id), method, method === "QR_Code" ? `EQUIPHUB:${booking_id}:${Date.now()}` : null, method === "OTP" ? makeOtp() : null],
  );
  res.status(201).json({ ...created.rows[0], handover_id: created.rows[0].id });
});

app.post("/api/v1/handover/verify", async (req, res) => {
  const { handover_id, verification_code, verified_by = 0 } = req.body;
  const handoverRes = await query("SELECT * FROM rental_handover_records WHERE id = $1", [Number(handover_id)]);
  const handover = handoverRes.rows[0];
  if (!handover) return res.status(404).json({ message: "Handover record not found" });

  if (handover.verification_method === "OTP" && handover.otp_code !== verification_code) return res.status(400).json({ message: "Invalid OTP" });
  if (handover.otp_expires_at && new Date(handover.otp_expires_at) < new Date()) {
    await query("UPDATE rental_handover_records SET verification_status = 'expired' WHERE id = $1", [handover.id]);
    return res.status(400).json({ message: "OTP expired" });
  }

  const verifiedAt = new Date().toISOString();
  const handoverUpdated = await query(
    "UPDATE rental_handover_records SET verification_status = 'verified', verified_by = $1, verified_at = $2 WHERE id = $3 RETURNING *",
    [Number(verified_by), verifiedAt, handover.id],
  );
  const bookingUpdateSql = handover.handover_type === "Pickup"
    ? "UPDATE rental_bookings SET booking_status = 'active', pickup_verified_at = $1, pickup_verified_by = $2 WHERE id = $3 RETURNING *"
    : "UPDATE rental_bookings SET booking_status = 'completed', return_verified_at = $1, return_verified_by = $2 WHERE id = $3 RETURNING *";
  const bookingUpdated = await query(bookingUpdateSql, [verifiedAt, Number(verified_by), handover.booking_id]);
  const status = handover.handover_type === "Pickup" ? "rented" : "available";
  const assetUpdated = await query("UPDATE rental_assets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT asset_id FROM rental_bookings WHERE id = $2) RETURNING *", [status, handover.booking_id]);

  res.json({ message: "Handover verified", handover: { ...handoverUpdated.rows[0], handover_id: handoverUpdated.rows[0].id }, booking: bookingUpdated.rows[0], asset: assetUpdated.rows[0] });
});

app.post("/api/v1/handover/return/complete", async (req, res) => {
  const { booking_id, condition_photos = [] } = req.body;
  const booking = await query("SELECT id FROM rental_bookings WHERE id = $1", [Number(booking_id)]);
  if (!booking.rows[0]) return res.status(404).json({ message: "Booking not found" });

  const handover = await query(
    `INSERT INTO rental_handover_records (
      booking_id, handover_type, verification_method, otp_code, otp_expires_at, verification_status, expires_at
    ) VALUES ($1,'Return','OTP',$2,NOW() + INTERVAL '30 minutes','pending',NOW() + INTERVAL '30 minutes') RETURNING *`,
    [Number(booking_id), makeOtp()],
  );

  const photoTypes = ["Front_View", "Back_View", "Accessories", "Serial_Number"];
  for (let i = 0; i < condition_photos.length; i += 1) {
    await query("INSERT INTO condition_photos (handover_id, photo_type, image_url) VALUES ($1,$2,$3)", [handover.rows[0].id, photoTypes[i] || "Front_View", condition_photos[i]]);
  }

  res.status(201).json({ message: "Return initiated", handover: { ...handover.rows[0], handover_id: handover.rows[0].id } });
});

app.get("/api/v1/rentals", async (req, res) => {
  const userId = Number(req.query.user_id || 777);
  const baseSql = `
    SELECT b.*, a.asset_name, a.pickup_location, u.display_name as owner_name
    FROM rental_bookings b
    JOIN rental_assets a ON a.id = b.asset_id
    LEFT JOIN users u ON u.id = b.owner_id
    WHERE %COND%
    ORDER BY b.created_at DESC
  `;
  const asRenter = await query(baseSql.replace("%COND%", "b.renter_id = $1"), [userId]);
  const asOwner = await query(baseSql.replace("%COND%", "b.owner_id = $1"), [userId]);
  const enrich = (b) => ({
    id: b.id,
    assetName: b.asset_name,
    owner: b.owner_name || `User ${b.owner_id}`,
    renter: `User ${b.renter_id}`,
    startDate: b.start_date,
    endDate: b.end_date,
    status: STATUS_FROM_DB[b.booking_status] || b.booking_status,
    dailyRate: Number(b.daily_rate),
    totalPaid: Number(b.total_amount),
    totalEarning: Number(b.total_rental_amount),
    location: b.pickup_location,
    bookingId: b.id,
  });
  res.json({ asRenter: asRenter.rows.map(enrich), asOwner: asOwner.rows.map(enrich) });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`EquipHub backend running on http://localhost:${port}`);
});
