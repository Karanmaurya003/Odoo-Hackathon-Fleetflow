from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, FuelLog, Vehicle
from app_route.decorators import roles_required, all_roles
from models import Role

fuel_bp = Blueprint("fuel", __name__, url_prefix="/api/fuel")


@fuel_bp.route("/", methods=["GET"])
@login_required
@all_roles
def list_fuel_logs():
    vehicle_id = request.args.get("vehicle_id", type=int)
    query = FuelLog.query
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    logs = query.order_by(FuelLog.date.desc()).all()
    return jsonify({"fuel_logs": [log.to_dict() for log in logs]}), 200


@fuel_bp.route("/<int:log_id>", methods=["GET"])
@login_required
@all_roles
def get_fuel_log(log_id):
    log = FuelLog.query.get_or_404(log_id, description="Fuel log not found")
    return jsonify({"fuel_log": log.to_dict()}), 200


@fuel_bp.route("/", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
def create_fuel_log():
    data = request.get_json()
    required = ["vehicle_id", "liters", "cost"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    log_date = date.today()
    if data.get("date"):
        try:
            log_date = date.fromisoformat(data["date"])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    log = FuelLog(
        vehicle_id=vehicle.id,
        liters=float(data["liters"]),
        cost=float(data["cost"]),
        date=log_date,
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"message": "Fuel log created", "fuel_log": log.to_dict()}), 201


@fuel_bp.route("/<int:log_id>", methods=["PUT"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def update_fuel_log(log_id):
    log = FuelLog.query.get_or_404(log_id, description="Fuel log not found")
    data = request.get_json()
    if "liters" in data:
        log.liters = float(data["liters"])
    if "cost" in data:
        log.cost = float(data["cost"])
    if "date" in data:
        try:
            log.date = date.fromisoformat(data["date"])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    db.session.commit()
    return jsonify({"message": "Fuel log updated", "fuel_log": log.to_dict()}), 200


@fuel_bp.route("/<int:log_id>", methods=["DELETE"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def delete_fuel_log(log_id):
    log = FuelLog.query.get_or_404(log_id, description="Fuel log not found")
    db.session.delete(log)
    db.session.commit()
    return jsonify({"message": "Fuel log deleted"}), 200
