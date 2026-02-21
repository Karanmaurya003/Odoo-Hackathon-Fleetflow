from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, Trip, Vehicle, Driver, VehicleStatus, DriverStatus, TripStatus
from app_route.decorators import roles_required, all_roles
from models import Role

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")


def _validate_trip_creation(vehicle: Vehicle, driver: Driver, cargo_weight: float):
    """Run all business-rule validations for trip creation."""
    errors = []

    if vehicle.status != VehicleStatus.AVAILABLE:
        errors.append(f"Vehicle '{vehicle.name}' is not Available (current: {vehicle.status})")

    if driver.status != DriverStatus.OFF_DUTY:
        errors.append(f"Driver '{driver.name}' is not OffDuty (current: {driver.status})")

    if driver.license_expiry < date.today():
        errors.append(
            f"Driver '{driver.name}' license expired on {driver.license_expiry.isoformat()}"
        )

    if cargo_weight > vehicle.max_capacity:
        errors.append(
            f"Cargo weight {cargo_weight} kg exceeds vehicle max capacity {vehicle.max_capacity} kg"
        )

    return errors


@trips_bp.route("/", methods=["GET"])
@login_required
@all_roles
def list_trips():
    status = request.args.get("status")
    vehicle_id = request.args.get("vehicle_id", type=int)
    driver_id = request.args.get("driver_id", type=int)

    query = Trip.query
    if status:
        query = query.filter_by(status=status)
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    if driver_id:
        query = query.filter_by(driver_id=driver_id)

    trips = query.order_by(Trip.id.desc()).all()
    return jsonify({"trips": [t.to_dict() for t in trips]}), 200


@trips_bp.route("/<int:trip_id>", methods=["GET"])
@login_required
@all_roles
def get_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id, description="Trip not found")
    return jsonify({"trip": trip.to_dict()}), 200


@trips_bp.route("/", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
def create_trip():
    data = request.get_json()
    required = ["vehicle_id", "driver_id", "cargo_weight", "start_odometer", "start_date"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    driver = Driver.query.get(data["driver_id"])
    if not driver:
        return jsonify({"error": "Driver not found"}), 404

    cargo_weight = float(data["cargo_weight"])
    errors = _validate_trip_creation(vehicle, driver, cargo_weight)
    if errors:
        return jsonify({"error": "Trip validation failed", "details": errors}), 422

    try:
        start_date = date.fromisoformat(data["start_date"])
    except ValueError:
        return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400

    trip = Trip(
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        cargo_weight=cargo_weight,
        revenue=float(data.get("revenue", 0)),
        start_odometer=float(data["start_odometer"]),
        status=TripStatus.DISPATCHED,
        start_date=start_date,
    )

    # Update vehicle and driver statuses
    vehicle.status = VehicleStatus.ON_TRIP
    driver.status = DriverStatus.ON_DUTY

    db.session.add(trip)
    db.session.commit()
    return jsonify({"message": "Trip created and dispatched", "trip": trip.to_dict()}), 201


@trips_bp.route("/<int:trip_id>/complete", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
def complete_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id, description="Trip not found")

    if trip.status != TripStatus.DISPATCHED:
        return jsonify({"error": f"Trip cannot be completed (current status: {trip.status})"}), 400

    data = request.get_json()
    if data.get("end_odometer") is None:
        return jsonify({"error": "end_odometer is required to complete a trip"}), 400

    end_odometer = float(data["end_odometer"])
    if end_odometer <= trip.start_odometer:
        return jsonify({"error": "end_odometer must be greater than start_odometer"}), 400

    if data.get("end_date"):
        try:
            trip.end_date = date.fromisoformat(data["end_date"])
        except ValueError:
            return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
    else:
        trip.end_date = date.today()

    if data.get("revenue") is not None:
        trip.revenue = float(data["revenue"])

    trip.end_odometer = end_odometer
    trip.status = TripStatus.COMPLETED

    # Update vehicle odometer and status
    vehicle = trip.vehicle
    vehicle.odometer = end_odometer
    vehicle.status = VehicleStatus.AVAILABLE

    # Update driver status
    driver = trip.driver
    driver.status = DriverStatus.OFF_DUTY

    db.session.commit()
    return jsonify({
        "message": "Trip completed",
        "trip": trip.to_dict(),
        "distance_km": trip.distance(),
    }), 200


@trips_bp.route("/<int:trip_id>/cancel", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
def cancel_trip(trip_id):
    trip = Trip.query.get_or_404(trip_id, description="Trip not found")

    if trip.status not in (TripStatus.DRAFT, TripStatus.DISPATCHED):
        return jsonify({"error": f"Trip cannot be cancelled (current status: {trip.status})"}), 400

    if trip.status == TripStatus.DISPATCHED:
        # Release vehicle and driver
        trip.vehicle.status = VehicleStatus.AVAILABLE
        trip.driver.status = DriverStatus.OFF_DUTY

    trip.status = TripStatus.CANCELLED
    db.session.commit()
    return jsonify({"message": "Trip cancelled", "trip": trip.to_dict()}), 200
