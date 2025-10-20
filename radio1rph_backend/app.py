# app.py (DEV AUTH BYPASS DEFAULT + fast DB probe; CORS + JWT kept)
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, date, timedelta
from sqlalchemy import Enum, Numeric, func
from sqlalchemy.exc import IntegrityError
from decimal import Decimal, InvalidOperation
import os
import uuid
import atexit
import mimetypes  # for accurate Content-Type on previews
import json 
import secrets
import smtplib
from email.message import EmailMessage
from io import StringIO
import csv
# --- Scheduler for daily jobs (expiry reminders) ---
from apscheduler.schedulers.background import BackgroundScheduler

# --- JWT ---
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt, get_jwt_identity, verify_jwt_in_request
)
try:
    from flask_jwt_extended import decode_token
except Exception:
    from flask_jwt_extended.utils import decode_token  # type: ignore

# --------------------------
# Flask App Initialization
# --------------------------
app = Flask(__name__)

# ===== Auth kill-switch (defaults to True for DEV) =====
AUTH_DISABLED = os.environ.get("AUTH_DISABLED", "true").strip().lower() in ("1", "true", "yes", "on")

# CORS (explicit: methods + Authorization header)
CORS(
    app,
    resources={r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Disposition"],
    }},
    supports_credentials=False,
)

# ==== JWT config (kept for when you re-enable auth) ====
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=6)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=14)
jwt = JWTManager(app)

# ==== Uploads config ====
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
QUALI_SUBDIR = "qualifications"
QUALI_DIR = os.path.join(UPLOAD_ROOT, QUALI_SUBDIR)
os.makedirs(QUALI_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def save_uploaded_document(file_storage):
    if not file_storage or not file_storage.filename:
        return None
    filename = secure_filename(file_storage.filename)
    if not allowed_file(filename):
        return None
    unique = f"{uuid.uuid4().hex}_{filename}"
    dest_path = os.path.join(QUALI_DIR, unique)
    file_storage.save(dest_path)
    return f"/uploads/{QUALI_SUBDIR}/{unique}"

# --- INLINE PREVIEW FRIENDLY: serve uploads with proper headers ---
@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    path = os.path.join(UPLOAD_ROOT, filename)
    if not os.path.isfile(path):
        return abort(404)
    mime, _ = mimetypes.guess_type(path)
    resp = send_from_directory(UPLOAD_ROOT, filename, as_attachment=False, mimetype=mime)
    resp.headers["Content-Type"] = mime or "application/octet-stream"
    resp.headers["Content-Disposition"] = f'inline; filename="{os.path.basename(path)}"'
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp

# --------------------------
# Database configuration
# --------------------------
# Use 127.0.0.1 and a short connect timeout so startup fails fast if DB is unreachable
app.config['SQLALCHEMY_DATABASE_URI'] = "mysql+pymysql://root:Veerabhadra%401.@127.0.0.1:3306/radio1rph"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_pre_ping": True,
    "pool_recycle": 280,
    "connect_args": {"connect_timeout": 5},
}
db = SQLAlchemy(app)

# --------------------------
# SQLAlchemy Models
# --------------------------
class Volunteer(db.Model):
    __tablename__ = 'volunteers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(32), nullable=True)  # not DB-unique; enforced in code
    emergency_contact = db.Column(db.String(255))
    status = db.Column(Enum('active', 'inactive'), default='active')
    training_goals = db.Column(db.Text)
    password_hash = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    qualifications = db.relationship('Qualification', backref='volunteer', lazy=True)
    attendance = db.relationship('Attendance', backref='volunteer', lazy=True)
    eois = db.relationship('EOI', backref='volunteer', lazy=True)

class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(Enum('admin','superadmin'), default='admin')
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)

class PasswordResetToken(db.Model):
    """Admin password reset tokens."""
    __tablename__ = "password_reset_tokens"
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class VolPasswordResetToken(db.Model):
    __tablename__ = "vol_password_reset_tokens"
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey('volunteers.id'), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # fixed typo

class Training(db.Model):
    __tablename__ = 'trainings'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    type = db.Column(Enum('internal','external'), default='internal')
    provider = db.Column(db.String(255))
    trainer_name = db.Column(db.String(255))
    accreditation = db.Column(Enum('external_accredited', 'external_non_accredited', 'in_house'), default='in_house')
    # NOTE: keep original nested Column for back-compat
    delivery_mode = db.Column(db.Column(Enum('online', 'in_person', 'hybrid'), default='in_person').type)
    venue = db.Column(db.String(255))
    cost = db.Column(Numeric(10, 2))
    prerequisites = db.Column(db.Text)
    capacity = db.Column(db.Integer)
    eoi_close_date = db.Column(db.Date)
    created_at = db.Column(db.TIMESTAMP, default=datetime.utcnow)
    qualifications = db.relationship('Qualification', backref='training', lazy=True)
    eois = db.relationship('EOI', backref='training', lazy=True)

class Qualification(db.Model):
    __tablename__ = 'qualifications'
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey('volunteers.id'), nullable=False)
    training_id = db.Column(db.Integer, db.ForeignKey('trainings.id'), nullable=False)
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    document_path = db.Column(db.String(255))

class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey('volunteers.id'), nullable=False)
    clock_in = db.Column(db.DateTime)
    clock_out = db.Column(db.DateTime)

class EOI(db.Model):
    __tablename__ = 'eois'
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey('volunteers.id'), nullable=False)
    training_id = db.Column(db.Integer, db.ForeignKey('trainings.id'), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(Enum('pending', 'approved', 'rejected', 'cancelled', 'standby'), default='pending')

class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    audience = db.Column(db.String(16), nullable=False, default="volunteer")  # 'volunteer' | 'admin'
    volunteer_id = db.Column(db.Integer, nullable=True)  # null for admin-wide notices
    type = db.Column(db.String(64), nullable=False)     # e.g. 'qualification_expiry_t90', 'training_result_*'
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=True)
    meta = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "audience": self.audience,
            "volunteer_id": self.volunteer_id,
            "type": self.type,
            "title": self.title,
            "body": self.body,
            "meta": self.meta or {},
            "created_at": self.created_at.isoformat() + "Z",
            "read_at": self.read_at.isoformat() + "Z" if self.read_at else None,
        }

class TrainingResult(db.Model):
    __tablename__ = "training_results"
    id = db.Column(db.Integer, primary_key=True)
    volunteer_id = db.Column(db.Integer, db.ForeignKey('volunteers.id'), nullable=False)
    training_id = db.Column(db.Integer, db.ForeignKey('trainings.id'), nullable=False)
    # >>> UPDATED: include 'did_not_attend'
    result = db.Column(Enum('competent','not_yet_competent','not_assessed','participated','did_not_attend'), nullable=False)
    issued_by = db.Column(Enum('inhouse','external'), nullable=False, default='inhouse')
    assessor_name = db.Column(db.String(120))
    date_assessed = db.Column(db.Date, default=date.today)
    certificate_path = db.Column(db.String(255))
    evidence_path = db.Column(db.String(255))
    notes = db.Column(db.Text)
    next_opportunity = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('volunteer_id', 'training_id', name='uniq_volunteer_training_result'),)

# --------------------------
# Helpers
# --------------------------
def parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.fromisoformat(str(value)).date()
    except Exception:
        try:
            return datetime.strptime(str(value), "%Y-%m-%d").date()
        except Exception:
            return None

def parse_decimal(value):
    if value in (None, "", "null"):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None

def format_date(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value

def decimal_to_str(val):
    if val is None:
        return None
    try:
        return f"{Decimal(val):.2f}"
    except Exception:
        return str(val)

def parse_intish(val):
    if val is None:
        return None
    s = str(val).strip().lower()
    if s in ("", "null", "none", "undefined"):
        return None
    try:
        return int(s)
    except Exception:
        return None

def _as_str(val):
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    return str(val)

def volunteer_to_dict(v):
    return {
        "volunteer_id": v.id,
        "name": v.name,
        "email": v.email,
        "phone": v.phone,
        "emergency_contact": v.emergency_contact,
        "status": v.status,
        "training_goals": v.training_goals,
        "created_at": format_date(v.created_at)
    }

def training_to_dict(t):
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "start_date": format_date(t.start_date),
        "end_date": format_date(t.end_date),
        "type": t.type,
        "provider": t.provider,
        "trainer_name": t.trainer_name,
        "accreditation": t.accreditation,
        "delivery_mode": t.delivery_mode,
        "venue": t.venue,
        "cost": decimal_to_str(t.cost),
        "prerequisites": t.prerequisites,
        "capacity": t.capacity,
        "eoi_close_date": format_date(t.eoi_close_date),
        "created_at": format_date(t.created_at),
    }

def qualification_to_dict(q):
    return {
        "id": q.id,
        "volunteer_id": q.volunteer_id,
        "training_id": q.training_id,
        "issue_date": format_date(q.issue_date),
        "expiry_date": format_date(q.expiry_date),
        "document_path": q.document_path
    }

def attendance_to_dict(a):
    return {
        "id": a.id,
        "volunteer_id": a.id if hasattr(a, "volunteer_id") else None,
        "volunteer_id": a.volunteer_id,
        "clock_in": format_date(a.clock_in),
        "clock_out": format_date(a.clock_out)
    }

def eoi_to_dict(e):
    return {
        "id": e.id,
        "volunteer_id": e.volunteer_id,
        "volunteer_name": e.volunteer.name if e.volunteer else None,
        "training_id": e.training_id,
        "training_title": e.training.title if e.training else None,
        "submitted_at": format_date(e.submitted_at),
        "status": e.status
    }

def training_capacity_stats(training_id: int):
    t = Training.query.get(training_id)
    cap = t.capacity if t else None
    approved = EOI.query.filter_by(training_id=training_id, status="approved").count()
    pending = EOI.query.filter_by(training_id=training_id, status="pending").count()
    standby = EOI.query.filter_by(training_id=training_id, status="standby").count()
    rejected = EOI.query.filter_by(training_id=training_id, status="rejected").count()
    remaining = None if cap is None else max(0, cap - approved)
    return {
        "training_id": training_id,
        "capacity": cap,
        "approved": approved,
        "pending": pending,
        "standby": standby,
        "rejected": rejected,
        "remaining": remaining,
        "counts": {"approved": approved, "pending": pending, "standby": standby, "rejected": rejected},
    }

# ---- Notifications helpers ----
def create_notification_if_absent(audience, volunteer_id, ntype, title, body, meta):
    window_start = datetime.utcnow() - timedelta(days=120)
    q = Notification.query.filter(
        Notification.audience == audience,
        Notification.type == ntype,
        Notification.created_at >= window_start,
    )
    if volunteer_id is None:
        q = q.filter(Notification.volunteer_id.is_(None))
    else:
        q = q.filter(Notification.volunteer_id == volunteer_id)

    key_fields = ("qualification_id", "result_id", "training_id")
    candidates = q.all()
    for cand in candidates:
        try:
            cm = cand.meta or {}
            if meta and any((cm.get(k) is not None and cm.get(k) == meta.get(k)) for k in key_fields):
                return None
        except Exception:
            pass

    n = Notification(
        audience=audience,
        volunteer_id=volunteer_id,
        type=ntype,
        title=title,
        body=body,
        meta=meta or {},
    )
    db.session.add(n)
    db.session.commit()
    return n

def _days_until(expiry_dt: date | None):
    if not expiry_dt:
        return None
    today = date.today()
    return (expiry_dt - today).days

def run_expiry_scan():
    try:
        quals = Qualification.query.filter(Qualification.expiry_date.isnot(None)).all()
        for q in quals:
            days = _days_until(q.expiry_date)
            if days is None:
                continue

            vol = Volunteer.query.get(q.volunteer_id) if q.volunteer_id else None
            vname = vol.name if vol else "Volunteer"

            base_meta = {
                "qualification_id": q.id,
                "training_id": q.training_id,
                "expiry_date": q.expiry_date.isoformat(),
                "volunteer_id": q.volunteer_id,
            }

            if days == 90:
                create_notification_if_absent(
                    "volunteer", q.volunteer_id,
                    "qualification_expiry_t90",
                    "Qualification expiring in 90 days",
                    f"Hi {vname}, your qualification will expire in 90 days. Please renew if required.",
                    base_meta,
                )
                create_notification_if_absent(
                    "admin", None,
                    "qualification_expiry_t90_admin",
                    f"{vname} has a qualification expiring in 90 days",
                    f"Qualification (ID {q.id}) for {vname} will expire in 90 days.",
                    base_meta,
                )

            if days == 14:
                create_notification_if_absent(
                    "volunteer", q.volunteer_id,
                    "qualification_expiry_t14",
                    "Qualification expiring in 14 days",
                    f"Hi {vname}, your qualification will expire in 14 days. Please renew.",
                    base_meta,
                )
                create_notification_if_absent(
                    "admin", None,
                    "qualification_expiry_t14_admin",
                    f"{vname} has a qualification expiring in 14 days",
                    f"Qualification (ID {q.id}) for {vname} will expire in 14 days.",
                    base_meta,
                )

            if days == 0:
                create_notification_if_absent(
                    "volunteer", q.volunteer_id,
                    "qualification_expired",
                    "Qualification expired",
                    f"Hi {vname}, your qualification has expired today.",
                    base_meta,
                )
                create_notification_if_absent(
                    "admin", None,
                    "qualification_expired_admin",
                    f"{vname} qualification expired",
                    f"Qualification (ID {q.id}) for {vname} expired today.",
                    base_meta,
                )
        print("[scheduler] expiry scan completed.")
    except Exception as e:
        print("[scheduler] expiry scan error:", e)

# -------- NEW: Training reminder scan (T-7 and T-1) --------
def run_training_reminders():
    """
    Sends reminders for upcoming trainings to:
      • Approved volunteers (per-training)
      • Admins/trainers (single roll-up per training)

    Triggers at T-7 and T-1 (days before start_date).
    """
    try:
        today = date.today()
        targets = {7, 1}
        trainings = Training.query.filter(Training.start_date.isnot(None)).all()

        for t in trainings:
            if not t.start_date:
                continue
            days = (t.start_date - today).days
            if days not in targets:
                continue

            # --- Common details
            when_str = t.start_date.strftime("%A, %d %B %Y")
            venue = t.venue or "Venue TBC"
            title = t.title or f"Training #{t.id}"

            # --- 1) Volunteers with approved EOIs
            approved_eois = (
                EOI.query
                .filter_by(training_id=t.id, status="approved")
                .all()
            )
            for e in approved_eois:
                vol = Volunteer.query.get(e.volunteer_id)
                if not vol:
                    continue
                vname = vol.name or "Volunteer"
                ntype = f"training_reminder_t{days}_vol"
                ntitle = f"Reminder: {title} on {when_str}"
                nbody = (
                    f"Hi {vname},\n\n"
                    f"This is a reminder that your training '{title}' is scheduled for {when_str}.\n"
                    f"Venue: {venue}\n"
                )
                if t.prerequisites:
                    nbody += f"\nNotes/requirements: {t.prerequisites}\n"
                create_notification_if_absent(
                    "volunteer",
                    vol.id,
                    ntype,
                    ntitle,
                    nbody,
                    {"training_id": t.id, "days": days}
                )
                if vol.email:
                    _try_send_email(vol.email, ntitle, nbody)

            # --- 2) Admins / Trainer roll-up (send once per training)
            ntype_admin = f"training_reminder_t{days}_admin"
            atitle = f"Trainer/Admin reminder: '{title}' on {when_str}"
            abody = (
                f"This is a reminder for the upcoming training.\n\n"
                f"Title: {title}\n"
                f"Date: {when_str}\n"
                f"Venue: {venue}\n"
                f"Trainer: {t.trainer_name or '—'}\n\n"
                f"Approved volunteers: {len(approved_eois)}\n"
            )
            create_notification_if_absent(
                "admin",
                None,
                ntype_admin,
                atitle,
                abody,
                {"training_id": t.id, "days": days}
            )

            # Email all admins (or the trainer if you later store an email)
            admins = Admin.query.all()
            for a in admins:
                if a.email:
                    _try_send_email(a.email, atitle, abody)

        print("[scheduler] training reminders scan completed.")
    except Exception as e:
        print("[scheduler] training reminders error:", e)

def init_scheduler(app):
    scheduler = BackgroundScheduler(timezone="UTC")
    # kick once after boot so you can see it working in dev logs
    scheduler.add_job(func=run_expiry_scan, trigger="date", next_run_time=datetime.utcnow() + timedelta(seconds=5))
    scheduler.add_job(func=run_expiry_scan, trigger="cron", hour=0, minute=10)
    # NEW: run training reminders daily at 00:15 UTC
    scheduler.add_job(func=run_training_reminders, trigger="cron", hour=0, minute=15)
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown(wait=False))

# --------------------------
# Email helper (no-op if SMTP not configured)
# --------------------------
def _try_send_email(to_email: str, subject: str, body: str):
    if not to_email:
        return
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    pwd  = os.environ.get("SMTP_PASS")
    sender = os.environ.get("SMTP_FROM", user or "no-reply@localhost")
    use_tls = os.environ.get("SMTP_TLS", "true").strip().lower() in ("1","true","yes","on")
    if not host or not user or not pwd:
        print("[email] SMTP not configured; skipping email to:", to_email)
        return

    try:
        msg = EmailMessage()
        msg["From"] = sender
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(host, port) as s:
            if use_tls:
                s.starttls()
            s.login(user, pwd)
            s.send_message(msg)
    except Exception as e:
        print("[email] send failed:", e)

# --------------------------
# Role/Auth helpers (dev bypass)
# --------------------------
def _make_tokens(identity_dict, role):
    add_claims = {"role": role}
    access = create_access_token(identity=identity_dict, additional_claims=add_claims)
    refresh = create_refresh_token(identity=identity_dict, additional_claims=add_claims)
    return access, refresh

def _require_role(required: str):
    claims = get_jwt() or {}
    role = claims.get("role")
    if required == "any":
        ok = role in ("admin", "superadmin", "volunteer")
    elif required == "admin":
        ok = role in ("admin", "superadmin")
    else:
        ok = (role == required)
    if not ok:
        return jsonify({"error": "Forbidden"}), 403
    return None

def admin_guard():
    if AUTH_DISABLED:
        return None
    try:
        verify_jwt_in_request()
    except Exception:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    return _require_role("admin")

def volunteer_or_admin_guard(volunteer_id_expected: int | None):
    if AUTH_DISABLED:
        return None
    try:
        verify_jwt_in_request()
    except Exception:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    claims = get_jwt() or {}
    ident = get_jwt_identity() or {}
    role = claims.get("role")
    if role in ("admin", "superadmin"):
        return None
    if role == "volunteer" and volunteer_id_expected and ident.get("volunteer_id") == volunteer_id_expected:
        return None
    return jsonify({"error": "Forbidden"}), 403

# --------------------------
# JWT error handlers
# --------------------------
@jwt.unauthorized_loader
def _missing_token(err):
    if AUTH_DISABLED:
        return jsonify({"identity": {"admin_id": 0, "email": "dev@local"}, "role": "admin"})
    return jsonify({"error": "Missing or invalid Authorization header"}), 401

@jwt.invalid_token_loader
def _bad_token(err):
    if AUTH_DISABLED:
        return jsonify({"identity": {"admin_id": 0, "email": "dev@local"}, "role": "admin"})
    return jsonify({"error": "Invalid token"}), 401

@jwt.expired_token_loader
def _expired_token(jwt_header, jwt_payload):
    if AUTH_DISABLED:
        return jsonify({"identity": {"admin_id": 0, "email": "dev@local"}, "role": "admin"})
    return jsonify({"error": "Token expired"}), 401

# --------------------------
# Test Route
# --------------------------
@app.route("/")
def home():
    return "Radio 1 RPH Volunteer Management API is running!"

# --------------------------
# Auth helper routes
# --------------------------
@app.route("/auth/me", methods=["GET"])
def auth_me():
    if AUTH_DISABLED:
        return jsonify({"identity": {"admin_id": 0, "email": "dev@local"}, "role": "admin"})
    try:
        verify_jwt_in_request()
    except Exception:
        return jsonify({"error": "Missing or invalid Authorization header"}), 401
    ident = get_jwt_identity() or {}
    claims = get_jwt() or {}
    return jsonify({"identity": ident, "role": claims.get("role")})

@app.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def auth_refresh():
    ident = get_jwt_identity()
    claims = get_jwt() or {}
    role = claims.get("role", "volunteer")
    access, _ = _make_tokens(ident, role)
    return jsonify({"access_token": access})

@app.route("/auth/refresh/json", methods=["POST"])
def auth_refresh_json():
    data = request.get_json(silent=True) or {}
    rt = data.get("refresh_token")
    if not rt:
        return jsonify({"error": "Missing refresh_token"}), 400
    try:
        decoded = decode_token(rt)
        if decoded.get("type") != "refresh":
            return jsonify({"error": "Wrong token type"}), 401
        ident = decoded.get("sub")
        role = decoded.get("role", "volunteer")
        access, _ = _make_tokens(ident, role)
        return jsonify({"access_token": access})
    except Exception:
        return jsonify({"error": "Invalid or expired refresh token"}), 401

# --------------------------
# Admin: register/login
# --------------------------
@app.route("/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    if Admin.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400
    hashed_password = generate_password_hash(data["password"])
    new_admin = Admin(
        name=data.get("name", ""),
        email=data["email"],
        password_hash=hashed_password,
        role=data.get("role", "admin")
    )
    db.session.add(new_admin)
    db.session.commit()
    return jsonify({"message": "Admin registered successfully", "id": new_admin.id}), 201

@app.route("/admin/login", methods=["POST"])
def login_admin():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing email or password"}), 400
    admin = Admin.query.filter_by(email=data["email"]).first()
    if not admin:
        return jsonify({"error": "Admin not found"}), 404
    if not check_password_hash(admin.password_hash, data["password"]):
        return jsonify({"error": "Incorrect password"}), 401
    access, refresh = _make_tokens(
        {"admin_id": admin.id, "email": admin.email},
        role=admin.role if admin.role in ("admin", "superadmin") else "admin",
    )
    return jsonify({
        "message": "Login successful",
        "admin_id": admin.id,
        "role": admin.role,
        "access_token": access,
        "refresh_token": refresh
    })

# --------------------------
# ADMIN: Forgot / Reset Password (aliases + OPTIONS)
# --------------------------
def _send_admin_reset_email(admin_email: str, token: str):
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    link = f"{frontend}/admin-reset-password?token={token}"
    print("[password-reset] link for", admin_email, "=>", link)
    _try_send_email(
        to_email=admin_email,
        subject="Admin password reset",
        body="Use this link to reset your password (valid for 1 hour):\n\n"
             f"{link}\n\nIf you didn’t request this, you can ignore this email."
    )

@app.route("/admin/forgot-password", methods=["POST", "OPTIONS"])
@app.route("/admin/request-password-reset", methods=["POST", "OPTIONS"])
def admin_forgot_password():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    admin = Admin.query.filter_by(email=email).first()
    if admin:
        token = secrets.token_urlsafe(32)
        pr = PasswordResetToken(
            admin_id=admin.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(pr)
        db.session.commit()
        _send_admin_reset_email(admin.email, token)
    return jsonify({"ok": True, "message": "If that email exists, we’ve sent a reset link."})

@app.route("/admin/reset-password", methods=["POST", "OPTIONS"])
def admin_reset_password():
    if request.method == "OPTIONS":
        return ("", 204)
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_pw = data.get("password") or data.get("new_password")
    if not token or not new_pw:
        return jsonify({"error": "token and password are required"}), 400
    pr = PasswordResetToken.query.filter_by(token=token).first()
    now = datetime.utcnow()
    if (not pr) or pr.used_at is not None or pr.expires_at < now:
        return jsonify({"error": "Invalid or expired token"}), 400
    admin = Admin.query.get(pr.admin_id)
    if not admin:
        return jsonify({"error": "Admin not found"}), 404
    admin.password_hash = generate_password_hash(new_pw)
    pr.used_at = now
    db.session.commit()
    return jsonify({"ok": True, "message": "Password has been reset. You can now log in."})

# --------------------------
# VOLUNTEER: Forgot / Reset Password (to match your new UI)
# --------------------------
def _send_vol_reset_email(vol_email: str, token: str):
    frontend = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    link = f"{frontend}/volunteer-reset-password?token={token}"
    print("[vol-password-reset] link for", vol_email, "=>", link)
    _try_send_email(
        to_email=vol_email,
        subject="Volunteer password reset",
        body=(
            "Use this link to reset your password (valid for 1 hour):\n\n"
            f"{link}\n\nIf you didn’t request this, you can ignore this email."
        ),
    )

@app.route("/volunteer/request-password-reset", methods=["POST", "OPTIONS"])
def volunteer_forgot_password():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    vol = Volunteer.query.filter_by(email=email).first()
    if vol:
        token = secrets.token_urlsafe(32)
        pr = VolPasswordResetToken(
            volunteer_id=vol.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        db.session.add(pr)
        db.session.commit()
        _send_vol_reset_email(vol.email, token)

    return jsonify({"ok": True, "message": "If an account exists, we’ve sent a reset link."})

@app.route("/volunteer/reset-password", methods=["POST", "OPTIONS"])
def volunteer_reset_password():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_pw = data.get("password") or data.get("new_password")

    if not token or not new_pw:
        return jsonify({"error": "token and password are required"}), 400

    pr = VolPasswordResetToken.query.filter_by(token=token).first()
    now = datetime.utcnow()
    if (not pr) or pr.used_at is not None or pr.expires_at < now:
        return jsonify({"error": "Invalid or expired token"}), 400

    vol = Volunteer.query.get(pr.volunteer_id)
    if not vol:
        return jsonify({"error": "Volunteer not found"}), 404

    vol.password_hash = generate_password_hash(new_pw)
    pr.used_at = now
    db.session.commit()
    return jsonify({"ok": True, "message": "Password has been reset. You can now log in."})

# --------------------------
# Volunteers (public reads)
# --------------------------
@app.route("/volunteers", methods=["GET", "OPTIONS"])
def get_volunteers():
    if request.method == "OPTIONS":
        return ("", 204)
    return jsonify([volunteer_to_dict(v) for v in Volunteer.query.all()])

@app.route("/volunteers/<int:id>", methods=["GET", "OPTIONS"])
def get_volunteer(id):
    if request.method == "OPTIONS":
        return ("", 204)
    v = Volunteer.query.get_or_404(id)
    return jsonify(volunteer_to_dict(v))

# --------------------------
# Volunteer Register/Login (self-service)
# --------------------------
def _validate_phone_unique_or_400(phone: str, current_id: int | None = None):
    if not phone:
        return
    q = Volunteer.query.filter_by(phone=phone)
    if current_id:
        q = q.filter(Volunteer.id != current_id)
    if q.first():
        abort(jsonify({"error": "Phone number already in use"}), 400)

@app.route("/volunteer/register", methods=["POST"])
@app.route("/volunteer/register/", methods=["POST"])
@app.route("/api/volunteer/register", methods=["POST"])
@app.route("/api/volunteer/register/", methods=["POST"])
def register_volunteer():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    raw_email = (data.get("email") or "").strip()
    email = raw_email.lower()                       # <-- normalize
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400

    # check existing (case-insensitive)
    exists = Volunteer.query.filter(func.lower(Volunteer.email) == email).first()
    if exists:
        return jsonify({"error": "An account already exists for that email"}), 400

    vol = Volunteer(
        name=name,
        email=email,                                # <-- stored lower-cased
        phone=phone or None,
        password_hash=generate_password_hash(password),
    )
    db.session.add(vol)
    db.session.commit()

    return jsonify({
        "ok": True,
        "volunteer_id": vol.id,
        "name": vol.name,
        "email": vol.email,
    }), 201


@app.route("/volunteer/login", methods=["POST"])
@app.route("/volunteer/login/", methods=["POST"])
@app.route("/api/volunteer/login", methods=["POST"])
@app.route("/api/volunteer/login/", methods=["POST"])
def login_volunteer():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing email or password"}), 400
    volunteer = Volunteer.query.filter_by(email=(data["email"] or "").strip().lower()).first()
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404
    if not (volunteer.password_hash and check_password_hash(volunteer.password_hash, data["password"])):
        return jsonify({"error": "Incorrect password"}), 401
    access, refresh = _make_tokens({"volunteer_id": volunteer.id, "email": volunteer.email}, role="volunteer")
    return jsonify({
        "message": "Login successful",
        "volunteer_id": volunteer.id,
        "name": volunteer.name,
        "email": volunteer.email,
        "emergency_contact": volunteer.emergency_contact,
        "access_token": access,
        "refresh_token": refresh
    })

# --------------------------
# Volunteers (Admin CRUD)
# --------------------------
@app.post("/volunteers")
def admin_add_volunteer():
    guard = admin_guard()
    if guard: return guard
    data = request.get_json(silent=True) or {}
    name = _as_str(data.get("name")) or ""
    email = (data.get("email") or "").strip().lower()
    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400
    if Volunteer.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400
    phone = _as_str(data.get("phone"))
    _validate_phone_unique_or_400(phone)
    pw = data.get("password")
    pw_hash = generate_password_hash(pw) if pw else None
    v = Volunteer(
        name=name,
        email=email,
        phone=phone,
        emergency_contact=_as_str(data.get("emergency_contact")),
        status=(data.get("status") or "active"),
        training_goals=_as_str(data.get("training_goals")),
        password_hash=pw_hash
    )
    db.session.add(v)
    db.session.commit()
    return jsonify({"message": "Volunteer created", "volunteer": volunteer_to_dict(v)}), 201

@app.put("/volunteers/<int:vid>")
def update_volunteer_self_or_admin(vid):
    # Allow: admins OR the volunteer whose id == vid
    guard = volunteer_or_admin_guard(vid)
    if guard:
        return guard

    v = Volunteer.query.get_or_404(vid)
    data = request.get_json(silent=True) or {}

    # Email: keep unique if changed
    if "email" in data and data.get("email"):
        new_email = (data.get("email") or "").strip().lower()
        if new_email != v.email and Volunteer.query.filter_by(email=new_email).first():
            return jsonify({"error": "Email already registered"}), 400
        v.email = new_email

    # Phone: keep unique (allow null/blank)
    if "phone" in data:
        new_phone = _as_str(data.get("phone"))
        _validate_phone_unique_or_400(new_phone, current_id=v.id)
        v.phone = new_phone

    # Safe fields volunteers can edit
    if "name" in data:
        v.name = _as_str(data.get("name")) or v.name
    if "emergency_contact" in data:
        v.emergency_contact = _as_str(data.get("emergency_contact"))
    if "training_goals" in data:
        v.training_goals = _as_str(data.get("training_goals"))

    # Only admins can change status or set password directly (optional guard)
    if "status" in data and data.get("status") in ("active","inactive"):
        v.status = data.get("status")

    if "password" in data and data.get("password"):
        v.password_hash = generate_password_hash(data.get("password"))

    db.session.commit()
    return jsonify({"message": "Volunteer updated", "volunteer": volunteer_to_dict(v)}), 200

# --- HARD DELETE WITH MANUAL CASCADE (fixes IntegrityError) ---
@app.delete("/volunteers/<int:vid>")
def admin_delete_volunteer(vid):
    guard = admin_guard()
    if guard: 
        return guard

    # 1) Ensure volunteer exists
    v = Volunteer.query.get_or_404(vid)

    try:
        # 2) Delete dependent rows first (no NULLing of FKs)
        Attendance.query.filter_by(volunteer_id=vid).delete(synchronize_session=False)
        EOI.query.filter_by(volunteer_id=vid).delete(synchronize_session=False)
        Qualification.query.filter_by(volunteer_id=vid).delete(synchronize_session=False)
        TrainingResult.query.filter_by(volunteer_id=vid).delete(synchronize_session=False)
        Notification.query.filter(
            Notification.audience == "volunteer",
            Notification.volunteer_id == vid
        ).delete(synchronize_session=False)

        # 3) Delete the volunteer
        db.session.delete(v)
        db.session.commit()
        return jsonify({"message": "Volunteer deleted"})
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "Could not delete volunteer due to related records", "detail": str(e)}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Unexpected error deleting volunteer", "detail": str(e)}), 500

# --------------------------
# Trainings CRUD
# --------------------------
@app.route("/trainings", methods=["GET"])
def get_trainings():
    trainings = Training.query.order_by(Training.start_date.asc()).all()
    return jsonify([training_to_dict(t) for t in trainings])
# ===== PUBLIC TRAININGS FIX =====
@app.route("/trainings/public", methods=["GET", "OPTIONS"])
def get_trainings_public():
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        trainings = Training.query.order_by(Training.start_date.asc()).all()
        data = []
        for t in trainings:
            data.append({
                "id": t.id,
                "title": t.title,
                "start_date": getattr(t, "start_date", None),
                "end_date": getattr(t, "end_date", None),
                "venue": getattr(t, "venue", None),
                "provider": getattr(t, "provider", None),
                "capacity": getattr(t, "capacity", None)
            })
        return jsonify(data), 200
    except Exception as e:
        print("Error in /trainings/public:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/trainings/<int:id>", methods=["GET"])
def get_training(id):
    t = Training.query.get_or_404(id)
    return jsonify(training_to_dict(t))

@app.route("/trainings/<int:id>/capacity", methods=["GET"])
def get_training_capacity(id):
    return jsonify(training_capacity_stats(id))

@app.route("/trainings", methods=["POST"])
def add_training():
    guard = admin_guard()
    if guard: return guard
    data = request.get_json() or {}
    new_t = Training(
        title=data["title"],
        description=data.get("description"),
        start_date=parse_date(data.get("start_date")),
        end_date=parse_date(data.get("end_date")),
        type=data.get("type", "internal"),
        provider=data.get("provider"),
        trainer_name=data.get("trainer_name"),
        accreditation=data.get("accreditation", "in_house"),
        delivery_mode=data.get("delivery_mode", "in_person"),
        venue=data.get("venue"),
        cost=parse_decimal(data.get("cost")),
        prerequisites=data.get("prerequisites"),
        capacity=(int(data["capacity"]) if str(data.get("capacity", "")).strip() not in ("", "null", "None") else None),
        eoi_close_date=parse_date(data.get("eoi_close_date")),
    )
    db.session.add(new_t)
    db.session.commit()
    return jsonify({"message": "Training added successfully", "id": new_t.id}), 201


@app.route("/trainings/<int:id>", methods=["PUT"])
def update_training(id):
    guard = admin_guard()
    if guard: return guard
    data = request.get_json() or {}
    t = Training.query.get_or_404(id)
    t.title = data.get("title", t.title)
    t.description = data.get("description", t.description)
    t.start_date = parse_date(data.get("start_date")) or t.start_date
    t.end_date = parse_date(data.get("end_date")) or t.end_date
    t.type = data.get("type", t.type)
    t.provider = data.get("provider", t.provider)
    t.trainer_name = data.get("trainer_name", t.trainer_name)
    t.accreditation = data.get("accreditation", t.accreditation)
    t.delivery_mode = data.get("delivery_mode", t.delivery_mode)
    t.venue = data.get("venue", t.venue)
    cost_val = parse_decimal(data.get("cost"))
    t.cost = cost_val if cost_val is not None else t.cost
    t.prerequisites = data.get("prerequisites", t.prerequisites)
    if "capacity" in data:
        try:
            t.capacity = int(data["capacity"]) if str(data["capacity"]).strip() not in ("", "null", "None") else None
        except Exception:
            pass
    eoi_cd = parse_date(data.get("eoi_close_date"))
    t.eoi_close_date = eoi_cd or t.eoi_close_date
    db.session.commit()
    return jsonify({"message": "Training updated successfully"})

@app.route("/trainings/<int:id>", methods=["DELETE"])
def delete_training(id):
    guard = admin_guard()
    if guard: return guard
    t = Training.query.get_or_404(id)
    db.session.delete(t)
    db.session.commit()
    return jsonify({"message": "Training deleted successfully"})

# --------------------------
# Qualifications CRUD
# --------------------------
@app.route("/qualifications", methods=["GET"])
def get_qualifications():
    return jsonify([qualification_to_dict(q) for q in Qualification.query.all()])

@app.route("/qualifications/volunteer/<int:volunteer_id>", methods=["GET"])
def get_qualifications_by_volunteer(volunteer_id):
    return jsonify([qualification_to_dict(q) for q in Qualification.query.filter_by(volunteer_id=volunteer_id)])

@app.route("/qualifications", methods=["POST"])
def add_qualification():
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("document") or request.files.get("document_path")
        volunteer_id = parse_intish(form.get("volunteer_id"))
        training_id = parse_intish(form.get("training_id"))
        issue_date = parse_date(form.get("issue_date"))
        expiry_date = parse_date(form.get("expiry_date"))
        document_path = None
        if not volunteer_id or not training_id or not issue_date:
            return jsonify({"error": "volunteer_id, training_id and issue_date are required"}), 400
        guard = volunteer_or_admin_guard(volunteer_id)
        if guard: return guard
        if file:
            saved_path = save_uploaded_document(file)
            if not saved_path:
                return jsonify({"error": "Invalid file type. Allowed: pdf, png, jpg, jpeg"}), 400
            document_path = saved_path
        else:
            document_path = form.get("document_url") or form.get("document_path")
    else:
        data = request.get_json() or {}
        volunteer_id = parse_intish(data.get("volunteer_id"))
        training_id = parse_intish(data.get("training_id"))
        issue_date = parse_date(data.get("issue_date"))
        expiry_date = parse_date(data.get("expiry_date"))
        document_path = data.get("document_url") or data.get("document_path")
        if not volunteer_id or not training_id or not issue_date:
            return jsonify({"error": "volunteer_id, training_id and issue_date are required"}), 400
        guard = volunteer_or_admin_guard(volunteer_id)
        if guard: return guard

    new_q = Qualification(
        volunteer_id=volunteer_id,
        training_id=training_id,
        issue_date=issue_date,
        expiry_date=expiry_date,
        document_path=document_path
    )
    db.session.add(new_q)
    db.session.commit()
    return jsonify({"message": "Qualification added successfully", "id": new_q.id, "document_path": new_q.document_path}), 201

@app.route("/qualifications/<int:id>", methods=["PUT"])
def update_qualification(id):
    q = Qualification.query.get_or_404(id)
    guard = volunteer_or_admin_guard(q.volunteer_id)
    if guard: return guard
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("document") or request.files.get("document_path")
        v_id = parse_intish(form.get("volunteer_id"))
        t_id = parse_intish(form.get("training_id"))
        if v_id: q.volunteer_id = v_id
        if t_id: q.training_id = t_id
        if "issue_date" in form:
            q.issue_date = parse_date(form.get("issue_date")) or q.issue_date
        if "expiry_date" in form:
            q.expiry_date = parse_date(form.get("expiry_date")) or q.expiry_date
        if file:
            saved_path = save_uploaded_document(file)
            if not saved_path:
                return jsonify({"error": "Invalid file type. Allowed: pdf, png, jpg, jpeg"}), 400
            q.document_path = saved_path
        elif form.get("document_url") or form.get("document_path"):
            q.document_path = form.get("document_url") or form.get("document_path")
    else:
        data = request.get_json() or {}
        v_id = parse_intish(data.get("volunteer_id"))
        t_id = parse_intish(data.get("training_id"))
        if v_id: q.volunteer_id = v_id
        if t_id: q.training_id = t_id
        q.issue_date = parse_date(data.get("issue_date")) or q.issue_date
        q.expiry_date = parse_date(data.get("expiry_date")) or q.expiry_date
        if "document_url" in data or "document_path" in data:
            q.document_path = data.get("document_url") or data.get("document_path")
    db.session.commit()
    return jsonify({"message": "Qualification updated successfully", "document_path": q.document_path})

@app.route("/qualifications/<int:id>", methods=["DELETE"])
def delete_qualification(id):
    guard = admin_guard()
    if guard: return guard
    q = Qualification.query.get_or_404(id)
    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Qualification deleted"})

# --------------------------
# Attendance
# --------------------------
@app.route("/attendance", methods=["GET"])
def get_attendance():
    return jsonify([attendance_to_dict(a) for a in Attendance.query.all()])

@app.route("/attendance/volunteer/<int:volunteer_id>", methods=["GET"])
def get_attendance_by_volunteer(volunteer_id):
    return jsonify([attendance_to_dict(a) for a in Attendance.query.filter_by(volunteer_id=volunteer_id)])

@app.route("/attendance/clockin", methods=["POST"])
def clock_in():
    data = request.get_json()
    new_att = Attendance(volunteer_id=data["volunteer_id"], clock_in=datetime.utcnow())
    db.session.add(new_att)
    db.session.commit()
    return jsonify({"message": "Clock-in recorded", "id": new_att.id})

@app.route("/attendance/clockout", methods=["POST"])
def clock_out():
    data = request.get_json()
    att = Attendance.query.filter_by(volunteer_id=data["volunteer_id"], clock_out=None).order_by(Attendance.clock_in.desc()).first()
    if not att:
        return jsonify({"error": "No active clock-in found"}), 404
    att.clock_out = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Clock-out recorded", "id": att.id})

@app.delete("/attendance")
def delete_all_attendance():
    guard = admin_guard()
    if guard: return guard
    num = Attendance.query.delete()
    db.session.commit()
    return jsonify({"ok": True, "deleted": num})

@app.get("/attendance/export")
def export_attendance_csv():
    # Parse ?date=YYYY-MM-DD (default today)
    dstr = (request.args.get("date") or "").strip()
    day = parse_date(dstr) or date.today()

    start = datetime.combine(day, datetime.min.time())
    end   = start + timedelta(days=1)

    rows = (
        db.session.query(Attendance, Volunteer)
        .join(Volunteer, Attendance.volunteer_id == Volunteer.id)
        .filter(Attendance.clock_in < end)
        .filter((Attendance.clock_out == None) | (Attendance.clock_out >= start))
        .order_by(Attendance.clock_in.asc())
        .all()
    )

    def _dur_minutes(a):
        if not a.clock_in:
            return ""
        end_time = a.clock_out or datetime.utcnow()
        secs = int((end_time - a.clock_in).total_seconds())
        return max(secs // 60, 0)

    sio = StringIO()
    w = csv.writer(sio)
    w.writerow([
        "date", "volunteer_id", "volunteer_name", "email",
        "clock_in_iso", "clock_out_iso", "duration_minutes"
    ])
    for a, v in rows:
        w.writerow([
            day.isoformat(),
            v.id,
            v.name or "",
            v.email or "",
            a.clock_in.isoformat() if a.clock_in else "",
            a.clock_out.isoformat() if a.clock_out else "",
            _dur_minutes(a),
        ])

    csv_data = sio.getvalue()
    resp = app.response_class(csv_data, mimetype="text/csv")
    resp.headers["Content-Disposition"] = f'attachment; filename="attendance_{day.isoformat()}.csv"'
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp

# --------------------------
# Volunteer-friendly alias routes
# --------------------------
@app.route("/volunteers/<int:volunteer_id>/attendance", methods=["GET"])
def get_attendance_by_volunteer_alias(volunteer_id):
    return jsonify([attendance_to_dict(a) for a in Attendance.query.filter_by(volunteer_id=volunteer_id)])

@app.route("/volunteers/<int:volunteer_id>/qualifications", methods=["GET"])
def get_qualifications_by_volunteer_alias(volunteer_id):
    return jsonify([qualification_to_dict(q) for q in Qualification.query.filter_by(volunteer_id=volunteer_id)])

@app.route("/volunteers/<int:volunteer_id>/eois", methods=["GET"])
def get_volunteer_eois_alias(volunteer_id):
    eois = EOI.query.filter_by(volunteer_id=volunteer_id).order_by(EOI.submitted_at.desc()).all()
    return jsonify([eoi_to_dict(e) for e in eois])

# --------------------------
# Notifications (volunteer + admin)  **CLEAN SINGLE DEFINITIONS**
# --------------------------
@app.route("/volunteers/<int:volunteer_id>/notifications", methods=["GET", "OPTIONS"])
def get_volunteer_notifications(volunteer_id):
    if request.method == "OPTIONS":
        return ("", 204)
    items = (Notification.query
             .filter(Notification.audience == "volunteer",
                     Notification.volunteer_id == volunteer_id)
             .order_by(Notification.created_at.desc())
             .all())
    return jsonify([n.serialize() for n in items])

@app.route("/admin/notifications", methods=["GET", "OPTIONS"])
def get_admin_notifications():
    if request.method == "OPTIONS":
        return ("", 204)
    # Allow bypass if auth disabled (DEV mode)
    if AUTH_DISABLED:
        items = (Notification.query
                 .filter(Notification.audience == "admin")
                 .order_by(Notification.created_at.desc())
                 .all())
        return jsonify([n.serialize() for n in items])
    guard = admin_guard()
    if guard:
        return guard
    items = (Notification.query
             .filter(Notification.audience == "admin")
             .order_by(Notification.created_at.desc())
             .all())
    return jsonify([n.serialize() for n in items])


@app.route("/notifications/<int:nid>/read", methods=["POST", "OPTIONS"])
def mark_notification_read(nid):
    if request.method == "OPTIONS":
        return ("", 204)
    n = Notification.query.get_or_404(nid)
    n.read_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True, "id": n.id, "read_at": n.read_at.isoformat() + "Z"})

# --------------------------
# Qualification reminders helpers
# --------------------------
@app.get("/qualifications/reminders/<int:volunteer_id>")
def get_qualification_reminders(volunteer_id):
    items = (Notification.query
             .filter(Notification.audience == "volunteer",
                     Notification.volunteer_id == volunteer_id,
                     Notification.type.like("qualification_%"))
             .order_by(Notification.created_at.desc())
             .all())
    out = []
    for n in items:
        meta = n.meta or {}
        msg = n.title
        t_title = None
        if meta.get("training_id"):
            t = Training.query.get(meta.get("training_id"))
            if t:
                t_title = t.title
        if t_title and meta.get("expiry_date"):
            msg = f"{t_title} — expires on {meta['expiry_date']} ({n.title})"
        elif t_title:
            msg = f"{t_title} — {n.title}"
        out.append({
            "id": n.id,
            "type": n.type,
            "message": msg,
            "created_at": n.created_at.isoformat() + "Z",
            "read_at": n.read_at.isoformat() + "Z" if n.read_at else None,
            "meta": meta,
        })
    return jsonify(out)

@app.post("/qualifications/reminders/run")
def reminders_run_alias():
    try:
        run_expiry_scan()
        return jsonify({"ok": True, "note": "Expiry reminder scan executed."})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Training Start Reminder Scan (1 week before start) ---
@app.route("/trainings/reminders/run", methods=["POST", "OPTIONS"])
def trainings_reminders_run():
    if request.method == "OPTIONS":
        return ("", 204)
    try:
        today = date.today()
        upcoming_start = today + timedelta(days=7)

        # Fetch trainings that start within the next 7 days
        upcoming_trainings = Training.query.filter(
            Training.start_date >= today,
            Training.start_date <= upcoming_start
        ).all()

        created = 0
        for t in upcoming_trainings:
            title = f"Upcoming Training: {t.title}"
            body = f"Training '{t.title}' starts on {t.start_date.strftime('%d %b %Y')} at {t.venue or 'TBD'}."
            
            # Check if reminder already exists
            exists = Notification.query.filter_by(
                audience="admin",
                type="training_start",
                title=title
            ).first()
            if not exists:
                n = Notification(
                    audience="admin",
                    volunteer_id=None,
                    title=title,
                    body=body,
                    type="training_start",
                    meta={"training_id": t.id, "start_date": str(t.start_date)},
                    created_at=datetime.utcnow()
                )
                db.session.add(n)
                created += 1

        db.session.commit()
        print(f"[Reminders] Created {created} new training-start reminders.")
        return jsonify({"message": f"Created {created} reminders", "count": created}), 200
    except Exception as e:
        print("Error in /trainings/reminders/run:", e)
        return jsonify({"error": str(e)}), 500

# --------------------------
# EOIs
# --------------------------
@app.route("/eois", methods=["POST"])
def submit_eoi_v2():
    data = request.get_json() or {}
    try:
        volunteer_id = parse_intish(data.get("volunteer_id") or data.get("volunteerId"))
        training_id  = parse_intish(data.get("training_id") or data.get("trainingId"))
    except Exception:
        volunteer_id = None
        training_id = None
    if not volunteer_id or not training_id:
        return jsonify({"error": "Missing volunteer_id or training_id"}), 400
    training = Training.query.get(training_id)
    if not training:
        return jsonify({"error": "Training not found"}), 404
    if training.eoi_close_date and date.today() > training.eoi_close_date:
        return jsonify({"error": "EOI close date has passed"}), 400
    existing = EOI.query.filter_by(volunteer_id=volunteer_id, training_id=training_id).first()
    if existing:
        if existing.status == "cancelled":
            existing.status = "pending"
            existing.submitted_at = datetime.utcnow()
            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return jsonify({"error": "Could not resubmit EOI due to a duplicate constraint."}), 400
            return jsonify({"id": existing.id, "status": existing.status, "resubmitted": True}), 200
        return jsonify({"error": "EOI already submitted", "status": existing.status}), 400
    new_eoi = EOI(volunteer_id=volunteer_id, training_id=training_id)
    db.session.add(new_eoi)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "EOI already exists for this volunteer and training"}), 400
    return jsonify({"id": new_eoi.id, "status": new_eoi.status}), 201

@app.route("/eois/submit", methods=["POST"])
def submit_eoi_legacy():
    return submit_eoi_v2()

@app.route("/eois/pending", methods=["GET"])
def get_pending_eois():
    guard = admin_guard()
    if guard: return guard
    training_id = request.args.get("training_id", type=int)
    query = EOI.query.filter_by(status="pending")
    if training_id:
        query = query.filter_by(training_id=training_id)
    eois = query.order_by(EOI.submitted_at.desc()).all()
    return jsonify([eoi_to_dict(e) for e in eois])

@app.route("/eois", methods=["GET"])
def list_eois():
    status = request.args.get("status")
    training_id = request.args.get("training_id", type=int)
    query = EOI.query
    if status:
        query = query.filter_by(status=status)
    if training_id:
        query = query.filter_by(training_id=training_id)
    eois = query.order_by(EOI.submitted_at.desc()).all()
    return jsonify([eoi_to_dict(e) for e in eois])

@app.route("/eois/<int:eoi_id>/approve", methods=["PUT"])
def approve_eoi(eoi_id):
    guard = admin_guard()
    if guard: return guard
    eoi = EOI.query.get_or_404(eoi_id)
    t = Training.query.get(eoi.training_id)
    if not t:
        return jsonify({"error": "Training not found"}), 404
    if t.capacity and t.capacity > 0:
        stats = training_capacity_stats(t.id)
        if stats["approved"] >= t.capacity:
            eoi.status = "standby"
            db.session.commit()
            return jsonify({"ok": True, "moved_to_standby": True, "capacity": t.capacity, "approved": stats["approved"]}), 200
    eoi.status = "approved"
    db.session.commit()
    return jsonify({"ok": True, "approved": True})

@app.route("/eois/<int:eoi_id>/reject", methods=["PUT"])
def reject_eoi(eoi_id):
    guard = admin_guard()
    if guard: return guard
    eoi = EOI.query.get_or_404(eoi_id)
    eoi.status = "rejected"
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/eois/<int:eoi_id>/standby", methods=["PUT"])
def standby_eoi(eoi_id):
    guard = admin_guard()
    if guard: return guard
    eoi = EOI.query.get_or_404(eoi_id)
    eoi.status = "standby"
    db.session.commit()
    return jsonify({"ok": True, "standby": True})

@app.route("/eois/<int:eoi_id>/promote", methods=["PUT"])
def promote_eoi(eoi_id):
    guard = admin_guard()
    if guard: return guard
    eoi = EOI.query.get_or_404(eoi_id)
    if eoi.status != "standby":
        return jsonify({"error": "Only standby EOIs can be promoted"}), 400
    t = Training.query.get(eoi.training_id)
    if not t:
        return jsonify({"error": "Training not found"}), 404
    if t.capacity and t.capacity > 0:
        stats = training_capacity_stats(t.id)
        if stats["approved"] >= t.capacity:
            return jsonify({"error": "Capacity full", "capacity": t.capacity}), 400
    eoi.status = "approved"
    db.session.commit()
    return jsonify({"ok": True, "approved": True})

@app.route("/eois/<int:eoi_id>/cancel", methods=["PUT"])
def cancel_eoi(eoi_id):
    eoi = EOI.query.get_or_404(eoi_id)
    if eoi.status not in ("pending", "approved", "standby"):
        return jsonify({"error": "Only pending/approved/standby EOIs can be cancelled"}), 400
    eoi.status = "cancelled"
    db.session.commit()
    return jsonify({"ok": True, "cancelled": True})

@app.route("/eois/volunteer/<int:volunteer_id>", methods=["GET"])
def get_volunteer_eois(volunteer_id):
    eois = EOI.query.filter_by(volunteer_id=volunteer_id).order_by(EOI.submitted_at.desc()).all()
    return jsonify([eoi_to_dict(e) for e in eois])

# --------------------------
# Catch-all OPTIONS for stray preflights (prevents 404 on OPTIONS)
# --------------------------
@app.route("/<path:_any>", methods=["OPTIONS"])
def catch_all_options(_any):
    return ("", 204)

# --------------------------
# Training Results API
# --------------------------
def _result_to_dict(r: TrainingResult):
    t = Training.query.get(r.training_id)
    return {
        "id": r.id,
        "volunteer_id": r.volunteer_id,
        "training_id": r.training_id,
        "training_title": t.title if t else None,
        "result": r.result,
        "issued_by": r.issued_by,
        "assessor_name": r.assessor_name,
        "date_assessed": format_date(r.date_assessed),
        "certificate_path": r.certificate_path,
        "evidence_path": r.evidence_path,
        "notes": r.notes,
        "next_opportunity": format_date(r.next_opportunity),
        "created_at": format_date(r.created_at),
    }

def _notify_training_result(r: TrainingResult):
    vol = Volunteer.query.get(r.volunteer_id)
    trn = Training.query.get(r.training_id)
    vname = vol.name if vol else "Volunteer"
    ttitle = trn.title if trn else f"Training #{r.training_id}"

    if r.result == "competent":
        title = f"Result recorded: Competent — {ttitle}"
        body = f"Congratulations {vname}, you have been recorded as Competent for {ttitle}."
        if r.certificate_path:
            body += f"\nCertificate: {r.certificate_path}"
        ntype = "training_result_competent"
    elif r.result == "participated":
        title = f"Result recorded: Participation — {ttitle}"
        body = f"Thanks {vname}, your participation in {ttitle} has been recorded."
        if r.certificate_path:
            body += f"\nCertificate of Participation: {r.certificate_path}"
        ntype = "training_result_participated"
    elif r.result == "not_yet_competent":
        title = f"Result recorded: Not Yet Competent — {ttitle}"
        if r.next_opportunity:
            when = r.next_opportunity.isoformat()
            body = f"{vname}, your result for {ttitle} is Not Yet Competent. Next opportunity expected on {when}."
        else:
            body = f"{vname}, your result for {ttitle} is Not Yet Competent. We’ll advise the next opportunity soon."
        ntype = "training_result_nyc"
    elif r.result == "did_not_attend":
        title = f"Result recorded: Did Not Attend — {ttitle}"
        body = (
            f"Hi {vname}, our records show you did not attend {ttitle}. "
            "If this is unexpected, please contact the training coordinator."
        )
        ntype = "training_result_did_not_attend"
    else:  # not_assessed
        title = f"Result recorded: Not Assessed — {ttitle}"
        body = f"{vname}, your result for {ttitle} is Not Assessed at this time."
        ntype = "training_result_not_assessed"

    meta = {
        "result_id": r.id,
        "training_id": r.training_id,
        "result": r.result,
        "certificate_path": r.certificate_path,
        "evidence_path": r.evidence_path,
        "next_opportunity": r.next_opportunity.isoformat() if r.next_opportunity else None
    }

    create_notification_if_absent("volunteer", r.volunteer_id, ntype, title, body, meta)

    if vol and vol.email:
        _try_send_email(
            to_email=vol.email,
            subject=f"Your training result for {ttitle}",
            body=body
        )

@app.post("/training-results")
def create_training_result():
    guard = admin_guard()
    if guard: return guard
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        volunteer_id = parse_intish(form.get("volunteer_id"))
        training_id = parse_intish(form.get("training_id"))
        result = (form.get("result") or "").strip().lower()
        issued_by = (form.get("issued_by") or "inhouse").strip().lower()
        assessor_name = form.get("assessor_name")
        date_assessed = parse_date(form.get("date_assessed")) or date.today()
        notes = form.get("notes")
        next_opp = parse_date(form.get("next_opportunity"))
        cert_file = request.files.get("certificate")
        evid_file = request.files.get("evidence")
        certificate_path = save_uploaded_document(cert_file) if cert_file else None
        evidence_path = save_uploaded_document(evid_file) if evid_file else None
    else:
        data = request.get_json() or {}
        volunteer_id = parse_intish(data.get("volunteer_id"))
        training_id = parse_intish(data.get("training_id"))
        result = (data.get("result") or "").strip().lower()
        issued_by = (data.get("issued_by") or "inhouse").strip().lower()
        assessor_name = data.get("assessor_name")
        date_assessed = parse_date(data.get("date_assessed")) or date.today()
        notes = data.get("notes")
        next_opp = parse_date(data.get("next_opportunity"))
        certificate_path = data.get("certificate_path")
        evidence_path = data.get("evidence_path")

    # >>> UPDATED: allow 'did_not_attend'
    if not volunteer_id or not training_id or result not in ("competent","not_yet_competent","not_assessed","participated","did_not_attend"):
        return jsonify({"error": "volunteer_id, training_id and valid result are required"}), 400
    if issued_by not in ("inhouse","external"):
        return jsonify({"error": "issued_by must be 'inhouse' or 'external'"}), 400

    existing = TrainingResult.query.filter_by(volunteer_id=volunteer_id, training_id=training_id).first()
    if existing:
        return jsonify({"error": "Result already exists for this volunteer and training", "id": existing.id}), 409

    r = TrainingResult(
        volunteer_id=volunteer_id,
        training_id=training_id,
        result=result,
        issued_by=issued_by,
        assessor_name=assessor_name,
        date_assessed=date_assessed,
        certificate_path=certificate_path,
        evidence_path=evidence_path,
        notes=notes,
        next_opportunity=next_opp
    )
    db.session.add(r)
    db.session.commit()
    _notify_training_result(r)
    return jsonify({"message": "Training result created", "result": _result_to_dict(r)}), 201

@app.put("/training-results/<int:result_id>")
def update_training_result(result_id):
    guard = admin_guard()
    if guard: return guard
    r = TrainingResult.query.get_or_404(result_id)
    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        if "result" in form:
            val = (form.get("result") or "").strip().lower()
            if val in ("competent","not_yet_competent","not_assessed","participated","did_not_attend"):
                r.result = val
        if "issued_by" in form:
            val = (form.get("issued_by") or "").strip().lower()
            if val in ("inhouse","external"):
                r.issued_by = val
        if "assessor_name" in form:
            r.assessor_name = form.get("assessor_name")
        if "date_assessed" in form:
            d = parse_date(form.get("date_assessed"))
            r.date_assessed = d or r.date_assessed
        if "notes" in form:
            r.notes = form.get("notes")
        if "next_opportunity" in form:
            r.next_opportunity = parse_date(form.get("next_opportunity")) or r.next_opportunity
        if request.files.get("certificate"):
            saved = save_uploaded_document(request.files.get("certificate"))
            if not saved:
                return jsonify({"error": "Invalid certificate file type"}), 400
            r.certificate_path = saved
        if request.files.get("evidence"):
            saved = save_uploaded_document(request.files.get("evidence"))
            if not saved:
                return jsonify({"error": "Invalid evidence file type"}), 400
            r.evidence_path = saved
    else:
        data = request.get_json() or {}
        val = (str(data.get("result") or "")).strip().lower()
        if val in ("competent","not_yet_competent","not_assessed","participated","did_not_attend"):
            r.result = val
        val = (str(data.get("issued_by") or "")).strip().lower()
        if val in ("inhouse","external"):
            r.issued_by = val
        if "assessor_name" in data:
            r.assessor_name = data.get("assessor_name")
        if "date_assessed" in data:
            d = parse_date(data.get("date_assessed"))
            r.date_assessed = d or r.date_assessed
        if "notes" in data:
            r.notes = data.get("notes")
        if "next_opportunity" in data:
            r.next_opportunity = parse_date(data.get("next_opportunity")) or r.next_opportunity
        if "certificate_path" in data:
            r.certificate_path = data.get("certificate_path") or r.certificate_path
        if "evidence_path" in data:
            r.evidence_path = data.get("evidence_path") or r.evidence_path
    db.session.commit()
    _notify_training_result(r)
    return jsonify({"message": "Training result updated", "result": _result_to_dict(r)})

@app.post("/training-results/<int:result_id>/certificate")
def upload_result_certificate(result_id):
    guard = admin_guard()
    if guard: return guard
    r = TrainingResult.query.get_or_404(result_id)
    file = request.files.get("certificate")
    if not file:
        return jsonify({"error": "Missing 'certificate' file"}), 400
    saved = save_uploaded_document(file)
    if not saved:
        return jsonify({"error": "Invalid file type. Allowed: pdf, png, jpg, jpeg"}), 400
    r.certificate_path = saved
    db.session.commit()
    _notify_training_result(r)
    return jsonify({"ok": True, "certificate_path": r.certificate_path, "result": _result_to_dict(r)})

@app.post("/training-results/<int:result_id>/evidence")
def upload_result_evidence(result_id):
    guard = admin_guard()
    if guard: return guard
    r = TrainingResult.query.get_or_404(result_id)
    file = request.files.get("evidence")
    if not file:
        return jsonify({"error": "Missing 'evidence' file"}), 400
    saved = save_uploaded_document(file)
    if not saved:
        return jsonify({"error": "Invalid file type. Allowed: pdf, png, jpg, jpeg"}), 400
    r.evidence_path = saved
    db.session.commit()
    _notify_training_result(r)
    return jsonify({"ok": True, "evidence_path": r.evidence_path, "result": _result_to_dict(r)})

@app.get("/trainings/<int:training_id>/results")
def list_training_results(training_id):
    guard = admin_guard()
    if guard: return guard
    rows = TrainingResult.query.filter_by(training_id=training_id).order_by(TrainingResult.created_at.desc()).all()
    return jsonify([_result_to_dict(r) for r in rows])

@app.get("/volunteers/<int:volunteer_id>/training-results")
def list_volunteer_results(volunteer_id):
    guard = volunteer_or_admin_guard(volunteer_id)
    if guard: return guard
    rows = TrainingResult.query.filter_by(volunteer_id=volunteer_id).order_by(TrainingResult.created_at.desc()).all()
    return jsonify([_result_to_dict(r) for r in rows])



@app.get("/__ping")
def __ping():
    return jsonify({"ok": True, "auth_disabled": AUTH_DISABLED})

@app.get("/__routes")
def __routes():
    # list all registered routes + methods so we can confirm /volunteer/login exists
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            "rule": str(rule),
            "methods": sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS"))
        })
    return jsonify(sorted(routes, key=lambda r: r["rule"]))

# --------------------------
# Run App
# --------------------------
if __name__ == "__main__":
    from sqlalchemy import text
    with app.app_context():
        try:
            db.session.execute(text("SELECT 1"))
        except Exception as e:
            print("\n[startup] Could not connect to MySQL. Check credentials / DB existence.")
            print("[startup] URI:", app.config['SQLALCHEMY_DATABASE_URI'])
            raise
        db.create_all()
        # init_scheduler(app)  # ← uncomment to enable daily scans (expiry + training reminders)
    # Disable reloader duplication issues
    app.run(debug=True, use_reloader=False, port=5000)
