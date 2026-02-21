from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, Vehicle, VehicleStatus
from app_route.decorators import roles_required, all_roles
from models import Role

vehicles_bp = Blueprint("vehicles", __name__, url_prefix="/api/vehicles")


@vehicles_bp.route("/", methods=["GET"])
@login_required
@all_roles
def list_vehicles():
    status = request.args.get("status")
    query = Vehicle.query
    if status:
        query = query.filter_by(status=status)
    vehicles = query.all()
    return jsonify({"vehicles": [v.to_dict() for v in vehicles]}), 200


@vehicles_bp.route("/<int:vehicle_id>", methods=["GET"])
@login_required
@all_roles
def get_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id, description="Vehicle not found")
    return jsonify({"vehicle": vehicle.to_dict()}), 200


@vehicles_bp.route("/", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def create_vehicle():
    data = request.get_json()
    required = ["name", "license_plate", "max_capacity", "acquisition_cost"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    if Vehicle.query.filter_by(license_plate=data["license_plate"]).first():
        return jsonify({"error": "License plate already registered"}), 409

    vehicle = Vehicle(
        name=data["name"],
        license_plate=data["license_plate"],
        max_capacity=float(data["max_capacity"]),
        odometer=float(data.get("odometer", 0)),
        acquisition_cost=float(data["acquisition_cost"]),
        status=data.get("status", VehicleStatus.AVAILABLE),
    )
    db.session.add(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle created", "vehicle": vehicle.to_dict()}), 201


@vehicles_bp.route("/<int:vehicle_id>", methods=["PUT"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def update_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id, description="Vehicle not found")
    data = request.get_json()

    updatable = ["name", "max_capacity", "odometer", "acquisition_cost", "status"]
    for field in updatable:
        if field in data:
            setattr(vehicle, field, data[field])

    if "license_plate" in data:
        existing = Vehicle.query.filter_by(license_plate=data["license_plate"]).first()
        if existing and existing.id != vehicle_id:
            return jsonify({"error": "License plate already in use"}), 409
        vehicle.license_plate = data["license_plate"]

    db.session.commit()
    return jsonify({"message": "Vehicle updated", "vehicle": vehicle.to_dict()}), 200


@vehicles_bp.route("/<int:vehicle_id>", methods=["DELETE"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id, description="Vehicle not found")
    if vehicle.status == VehicleStatus.ON_TRIP:
        return jsonify({"error": "Cannot delete a vehicle currently on a trip"}), 400
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({"message": "Vehicle deleted"}), 200


@vehicles_bp.route("/<int:vehicle_id>/retire", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def retire_vehicle(vehicle_id):
    vehicle = Vehicle.query.get_or_404(vehicle_id, description="Vehicle not found")
    if vehicle.status == VehicleStatus.ON_TRIP:
        return jsonify({"error": "Cannot retire a vehicle currently on a trip"}), 400
    vehicle.status = VehicleStatus.RETIRED
    db.session.commit()
    return jsonify({"message": "Vehicle retired", "vehicle": vehicle.to_dict()}), 200
