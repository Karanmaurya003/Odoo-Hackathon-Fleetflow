from datetime import date as dt_date
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import date, datetime
db = SQLAlchemy()

# ─────────────────────────────────────────
# Enums (stored as strings)
# ─────────────────────────────────────────

class Role:
    FLEET_MANAGER = "FleetManager"
    DISPATCHER = "Dispatcher"
    SAFETY_OFFICER = "SafetyOfficer"
    FINANCIAL_ANALYST = "FinancialAnalyst"

    ALL = [
        FLEET_MANAGER,
        DISPATCHER,
        SAFETY_OFFICER,
        FINANCIAL_ANALYST
    ]


class VehicleStatus:
    AVAILABLE = "Available"
    ON_TRIP = "OnTrip"
    IN_SHOP = "InShop"
    RETIRED = "Retired"
    available = 'available'
    in_use = 'in_use'


class TripStatus:
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


# ─────────────────────────────────────────
# User Model
# ─────────────────────────────────────────

class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False)

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role
        }


# ─────────────────────────────────────────
# Vehicle Model
# ─────────────────────────────────────────

class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    license_plate = db.Column(db.String(50), unique=True, nullable=False)
    max_capacity = db.Column(db.Float, nullable=False)  # kg
    odometer = db.Column(db.Float, nullable=False, default=0)  # km
    acquisition_cost = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default=VehicleStatus.AVAILABLE)

    trips = db.relationship("Trip", backref="vehicle", lazy=True)
    fuel_logs = db.relationship("FuelLog", backref="vehicle", lazy=True)
    maintenance_records = db.relationship("Maintenance", backref="vehicle", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "license_plate": self.license_plate,
            "max_capacity": self.max_capacity,
            "odometer": self.odometer,
            "acquisition_cost": self.acquisition_cost,
            "status": self.status
        }


# ─────────────────────────────────────────
# Driver Model
# ─────────────────────────────────────────

class Driver(db.Model):
    __tablename__ = 'drivers'

    # Primary and Foreign Keys
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, nullable=True)

    # Name parameters
    name = db.Column(db.String(255), nullable=True)
    first_name = db.Column(db.String(60), nullable=False)
    last_name = db.Column(db.String(60), nullable=False)

    # Contact and ID parameters
    email = db.Column(db.String(180), unique=True, nullable=True)
    phone = db.Column(db.String(20), nullable=False)
    license_number = db.Column(db.String(50), unique=True, nullable=False)
    license_type = db.Column(db.String(50), nullable=False)
    license_expiry = db.Column(db.Date, nullable=False)

    # Status and Performance
    status = db.Column(
        db.Enum('active', 'inactive', 'suspended', 'on_leave', 'on_duty'), 
        default='active', 
        nullable=False
    )
    safety_score = db.Column(db.Float, default=100.0)
    
    # Dates and Timestamps
    date_of_birth = db.Column(db.Date, nullable=True)
    hired_at = db.Column(db.Date, nullable=False, default=date.today)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    trips = db.relationship("Trip", backref="driver", lazy=True)

    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def license_is_valid(self):
        return self.license_expiry >= dt_date.today()

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name(),
            "license_type": self.license_type,
            "license_expiry": self.license_expiry.isoformat(),
            "status": self.status,
            "safety_score": self.safety_score
        }


# ─────────────────────────────────────────
# Trip Model
# ─────────────────────────────────────────

class Trip(db.Model):
    __tablename__ = "trips"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    driver_id = db.Column(db.Integer, db.ForeignKey("drivers.id"), nullable=False)

    cargo_weight = db.Column(db.Float, nullable=False)
    revenue = db.Column(db.Float, nullable=False, default=0)

    start_odometer = db.Column(db.Float, nullable=False)
    end_odometer = db.Column(db.Float, nullable=True)

    status = db.Column(db.String(20), nullable=False, default=TripStatus.DRAFT)

    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)

    def distance(self):
        if self.end_odometer is not None:
            return self.end_odometer - self.start_odometer
        return None

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "driver_id": self.driver_id,
            "cargo_weight": self.cargo_weight,
            "revenue": self.revenue,
            "start_odometer": self.start_odometer,
            "end_odometer": self.end_odometer,
            "distance_km": self.distance(),
            "status": self.status,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat() if self.end_date else None
        }


# ─────────────────────────────────────────
# Fuel Log Model
# ─────────────────────────────────────────

class FuelLog(db.Model):
    __tablename__ = "fuel_logs"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)

    liters = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)

    date = db.Column(db.Date, nullable=False, default=dt_date.today)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "liters": self.liters,
            "cost": self.cost,
            "date": self.date.isoformat()
        }


# ─────────────────────────────────────────
# Maintenance Model
# ─────────────────────────────────────────

class Maintenance(db.Model):
    __tablename__ = "maintenance"

    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)

    description = db.Column(db.String(500), nullable=False)
    cost = db.Column(db.Float, nullable=False)

    date = db.Column(db.Date, nullable=False, default=dt_date.today)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "description": self.description,
            "cost": self.cost,
            "date": self.date.isoformat()
        }
# --- Add these Constant Classes ---
class VehicleStatus:
    # Logic in trips.py needs these capitalized versions
    AVAILABLE = "Available"
    ON_TRIP = "OnTrip"
    IN_SHOP = "InShop"
    RETIRED = "Retired"
    
    # Keeping these for database compatibility if needed
    available = "Available"
    in_use = "OnTrip"

class DriverStatus:
    # Logic in trips.py needs these
    OFF_DUTY = "active"
    ON_DUTY = "on_duty"
    
    # Generic naming for other modules
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

class TripStatus:
    DRAFT = "Draft"
    DISPATCHED = "Dispatched"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    SCHEDULED = "Scheduled"