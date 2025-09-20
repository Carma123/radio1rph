from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, date
from sqlalchemy import Enum

# --------------------------
# Flask App Initialization
# --------------------------
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = "mysql+pymysql://root:Shanti%40%241003@localhost/radio1rph"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --------------------------
# SQLAlchemy Models
# --------------------------
class Volunteer(db.Model):
    __tablename__ = 'volunteers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    emergency_contact = db.Column(db.String(120))
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

class Training(db.Model):
    __tablename__ = 'trainings'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    type = db.Column(Enum('internal','external'), default='internal')
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
    status = db.Column(Enum('pending', 'approved', 'rejected'), default='pending')

# --------------------------
# Helper Functions
# --------------------------
def format_date(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value

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
        "created_at": format_date(t.created_at)
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

# --------------------------
# Test Route
# --------------------------
@app.route("/")
def home():
    return "Radio 1 RPH Volunteer Management API is running!"

# --------------------------
# Admin Routes
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
    if check_password_hash(admin.password_hash, data["password"]):
        return jsonify({"message": "Login successful", "admin_id": admin.id, "role": admin.role})
    return jsonify({"error": "Incorrect password"}), 401

# --------------------------
# Volunteer Routes
# --------------------------
@app.route("/volunteers", methods=["GET"])
def get_volunteers():
    return jsonify([volunteer_to_dict(v) for v in Volunteer.query.all()])

@app.route("/volunteers/<int:id>", methods=["GET"])
def get_volunteer(id):
    v = Volunteer.query.get_or_404(id)
    return jsonify(volunteer_to_dict(v))

@app.route("/volunteer/register", methods=["POST"])
def register_volunteer():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    if Volunteer.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400
    hashed_password = generate_password_hash(data["password"])
    new_volunteer = Volunteer(
        name=data.get("name", ""),
        email=data["email"],
        phone=data.get("phone"),
        emergency_contact=data.get("emergency_contact"),
        status="active",
        training_goals=data.get("training_goals"),
        password_hash=hashed_password
    )
    db.session.add(new_volunteer)
    db.session.commit()
    return jsonify({"message": "Volunteer registered successfully", "volunteer_id": new_volunteer.id}), 201

@app.route("/volunteer/login", methods=["POST"])
def login_volunteer():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing email or password"}), 400
    volunteer = Volunteer.query.filter_by(email=data["email"]).first()
    if not volunteer:
        return jsonify({"error": "Volunteer not found"}), 404
    if volunteer.password_hash and check_password_hash(volunteer.password_hash, data["password"]):
        return jsonify({
            "message": "Login successful",
            "volunteer_id": volunteer.id,
            "name": volunteer.name,
            "email": volunteer.email,
            "emergency_contact": volunteer.emergency_contact
        })
    return jsonify({"error": "Incorrect password"}), 401

# --------------------------
# Trainings CRUD
# --------------------------
@app.route("/trainings", methods=["GET"])
def get_trainings():
    return jsonify([training_to_dict(t) for t in Training.query.all()])

@app.route("/trainings/<int:id>", methods=["GET"])
def get_training(id):
    t = Training.query.get_or_404(id)
    return jsonify(training_to_dict(t))

@app.route("/trainings", methods=["POST"])
def add_training():
    data = request.get_json()
    new_t = Training(
        title=data["title"],
        description=data.get("description"),
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        type=data.get("type", "internal")
    )
    db.session.add(new_t)
    db.session.commit()
    return jsonify({"message": "Training added successfully", "id": new_t.id}), 201

@app.route("/trainings/<int:id>", methods=["PUT"])
def update_training(id):
    data = request.get_json()
    t = Training.query.get_or_404(id)
    t.title = data.get("title", t.title)
    t.description = data.get("description", t.description)
    t.start_date = data.get("start_date", t.start_date)
    t.end_date = data.get("end_date", t.end_date)
    t.type = data.get("type", t.type)
    db.session.commit()
    return jsonify({"message": "Training updated successfully"})

@app.route("/trainings/<int:id>", methods=["DELETE"])
def delete_training(id):
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
    data = request.get_json()
    new_q = Qualification(
        volunteer_id=data["volunteer_id"],
        training_id=data["training_id"],
        issue_date=data.get("issue_date"),
        expiry_date=data.get("expiry_date"),
        document_path=data.get("document_path")
    )
    db.session.add(new_q)
    db.session.commit()
    return jsonify({"message": "Qualification added successfully", "id": new_q.id}), 201

@app.route("/qualifications/<int:id>", methods=["PUT"])
def update_qualification(id):
    data = request.get_json()
    q = Qualification.query.get_or_404(id)
    q.volunteer_id = data.get("volunteer_id", q.volunteer_id)
    q.training_id = data.get("training_id", q.training_id)
    q.issue_date = data.get("issue_date", q.issue_date)
    q.expiry_date = data.get("expiry_date", q.expiry_date)
    q.document_path = data.get("document_path", q.document_path)
    db.session.commit()
    return jsonify({"message": "Qualification updated successfully"})

@app.route("/qualifications/<int:id>", methods=["DELETE"])
def delete_qualification(id):
    q = Qualification.query.get_or_404(id)
    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Qualification deleted successfully"})

# --------------------------
# Attendance CRUD
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
    new_att = Attendance(
        volunteer_id=data["volunteer_id"],
        clock_in=datetime.utcnow()
    )
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

# --------------------------
# EOI Routes
# --------------------------
@app.route("/eois/submit", methods=["POST"])
def submit_eoi():
    data = request.get_json()
    
    # Support multiple key styles
    volunteer_id = data.get("volunteer_id") or data.get("volunteerId")
    training_id = data.get("training_id") or data.get("trainingId")
    
    if not volunteer_id or not training_id:
        return jsonify({"error": "Missing volunteer_id or training_id"}), 400

    # Check duplicate
    if EOI.query.filter_by(volunteer_id=volunteer_id, training_id=training_id).first():
        return jsonify({"error": "EOI already submitted"}), 400

    new_eoi = EOI(
        volunteer_id=int(volunteer_id),
        training_id=int(training_id)
    )
    db.session.add(new_eoi)
    db.session.commit()
    return jsonify({"message": "EOI submitted successfully", "eoi_id": new_eoi.id}), 201

@app.route("/eois/pending", methods=["GET"])
def get_pending_eois():
    eois = EOI.query.filter_by(status="pending").all()
    return jsonify([eoi_to_dict(e) for e in eois])

@app.route("/eois/<int:eoi_id>/approve", methods=["PUT"])
def approve_eoi(eoi_id):
    eoi = EOI.query.get_or_404(eoi_id)
    eoi.status = "approved"
    db.session.commit()
    return jsonify({"message": "EOI approved successfully"})

@app.route("/eois/<int:eoi_id>/reject", methods=["PUT"])
def reject_eoi(eoi_id):
    eoi = EOI.query.get_or_404(eoi_id)
    eoi.status = "rejected"
    db.session.commit()
    return jsonify({"message": "EOI rejected successfully"})

@app.route("/eois", methods=["GET"])
def get_all_eois():
    eois = EOI.query.all()
    return jsonify([eoi_to_dict(e) for e in eois])

@app.route("/eois/volunteer/<int:volunteer_id>", methods=["GET"])
def get_volunteer_eois(volunteer_id):
    eois = EOI.query.filter_by(volunteer_id=volunteer_id).all()
    return jsonify([eoi_to_dict(e) for e in eois])

# --------------------------
# Run App
# --------------------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Ensure tables are created
    app.run(debug=True)
