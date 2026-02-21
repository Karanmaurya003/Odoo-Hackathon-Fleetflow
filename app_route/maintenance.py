from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, Maintenance, Vehicle, VehicleStatus
from app_route.decorators import roles_required, all_roles
from models import Role

maintenance_bp = Blueprint("maintenance", __name__, url_prefix="/api/maintenance")


@maintenance_bp.route("/", methods=["GET"])
@login_required
@all_roles
def list_maintenance():
    vehicle_id = request.args.get("vehicle_id", type=int)
    query = Maintenance.query
    if vehicle_id:
        query = query.filter_by(vehicle_id=vehicle_id)
    records = query.order_by(Maintenance.date.desc()).all()
    return jsonify({"maintenance": [r.to_dict() for r in records]}), 200


@maintenance_bp.route("/<int:record_id>", methods=["GET"])
@login_required
@all_roles
def get_maintenance(record_id):
    record = Maintenance.query.get_or_404(record_id, description="Maintenance record not found")
    return jsonify({"maintenance": record.to_dict()}), 200


@maintenance_bp.route("/", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.SAFETY_OFFICER)
def create_maintenance():
    data = request.get_json()
    required = ["vehicle_id", "description", "cost"]
    missing = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    vehicle = Vehicle.query.get(data["vehicle_id"])
    if not vehicle:
        return jsonify({"error": "Vehicle not found"}), 404

    if vehicle.status == VehicleStatus.ON_TRIP:
        return jsonify({"error": "Cannot schedule maintenance for a vehicle currently on a trip"}), 400

    if vehicle.status == VehicleStatus.RETIRED:
        return jsonify({"error": "Cannot schedule maintenance for a retired vehicle"}), 400

    maint_date = date.today()
    if data.get("date"):
        try:
            maint_date = date.fromisoformat(data["date"])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    record = Maintenance(
        vehicle_id=vehicle.id,
        description=data["description"],
        cost=float(data["cost"]),
        date=maint_date,
    )

    # Business rule: vehicle goes InShop
    vehicle.status = VehicleStatus.IN_SHOP

    db.session.add(record)
    db.session.commit()
    return jsonify({
        "message": "Maintenance record created. Vehicle is now InShop.",
        "maintenance": record.to_dict(),
        "vehicle_status": vehicle.status,
    }), 201


@maintenance_bp.route("/<int:record_id>/complete", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.SAFETY_OFFICER)
def complete_maintenance(record_id):
    """Mark maintenance done and return vehicle to Available."""
    record = Maintenance.query.get_or_404(record_id, description="Maintenance record not found")
    vehicle = record.vehicle

    # Only release if still InShop (could have other pending maintenance)
    other_pending = Maintenance.query.filter(
        Maintenance.vehicle_id == vehicle.id,
        Maintenance.id != record_id,
    ).count()

    if vehicle.status == VehicleStatus.IN_SHOP and other_pending == 0:
        vehicle.status = VehicleStatus.AVAILABLE

    db.session.commit()
    return jsonify({
        "message": "Maintenance completed",
        "vehicle_status": vehicle.status,
        "maintenance": record.to_dict(),
    }), 200


@maintenance_bp.route("/<int:record_id>", methods=["DELETE"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def delete_maintenance(record_id):
    record = Maintenance.query.get_or_404(record_id, description="Maintenance record not found")
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Maintenance record deleted"}), 200
