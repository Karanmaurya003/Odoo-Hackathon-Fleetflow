from datetime import date
from flask import Blueprint, request, jsonify
from flask_login import login_required
from models import db, Driver, DriverStatus, Role
from app_route.decorators import roles_required, all_roles

drivers_bp = Blueprint("drivers", __name__, url_prefix="/api/drivers")

@drivers_bp.route("/", methods=["GET"])
@login_required
@all_roles
def list_drivers():
    status = request.args.get("status")
    query = Driver.query
    if status:
        query = query.filter_by(status=status)
    drivers = query.all()
    return jsonify({"drivers": [d.to_dict() for d in drivers]}), 200

@drivers_bp.route("/<int:driver_id>", methods=["GET"])
@login_required
@all_roles
def get_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id, description="Driver not found")
    return jsonify({"driver": driver.to_dict()}), 200

@drivers_bp.route("/", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
def create_driver():
    data = request.get_json()
    
    # Basic validation
    if not data.get("name") or not data.get("license_type"):
        return jsonify({"error": "Missing name or license_type"}), 400

    try:
        expiry = date.fromisoformat(data.get("license_expiry", "2030-01-01"))
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    # Split name for database requirements
    name_parts = data["name"].split(" ", 1)
    f_name = name_parts[0]
    l_name = name_parts[1] if len(name_parts) > 1 else "N/A"

    # Create the object
    new_driver = Driver(
        name=data["name"],
        first_name=f_name,
        last_name=l_name,
        license_type=data["license_type"],
        license_expiry=expiry,
        phone=data.get("phone", "000-000-0000"),
        license_number=data.get("license_number", f"DL-{f_name.upper()}99"),
        status="active"
    )
    
    try:
        db.session.add(new_driver)
        db.session.commit()
        return jsonify({"message": "Driver created", "id": new_driver.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
    db.session.add(driver)
    db.session.commit()
    return jsonify({"message": "Driver created", "driver": driver.to_dict()}), 201

@drivers_bp.route("/<int:driver_id>", methods=["PUT"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER, Role.SAFETY_OFFICER)
def update_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id, description="Driver not found")
    data = request.get_json()

    if "name" in data:
        driver.name = data["name"]
    if "license_type" in data:
        driver.license_type = data["license_type"]
    if "license_expiry" in data:
        try:
            driver.license_expiry = date.fromisoformat(data["license_expiry"])
        except ValueError:
            return jsonify({"error": "Invalid license_expiry format. Use YYYY-MM-DD"}), 400
    if "status" in data:
        driver.status = data["status"]
    if "safety_score" in data:
        driver.safety_score = float(data["safety_score"])

    db.session.commit()
    return jsonify({"message": "Driver updated", "driver": driver.to_dict()}), 200

@drivers_bp.route("/<int:driver_id>/suspend", methods=["POST"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.SAFETY_OFFICER)
def suspend_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id, description="Driver not found")
    if driver.status == 'on_duty':
        return jsonify({"error": "Cannot suspend a driver currently on duty"}), 400
    driver.status = 'suspended'
    db.session.commit()
    return jsonify({"message": "Driver suspended", "driver": driver.to_dict()}), 200

@drivers_bp.route("/<int:driver_id>", methods=["DELETE"])
@login_required
@roles_required(Role.FLEET_MANAGER)
def delete_driver(driver_id):
    driver = Driver.query.get_or_404(driver_id, description="Driver not found")
    if driver.status == 'on_duty':
        return jsonify({"error": "Cannot delete a driver currently on duty"}), 400
    db.session.delete(driver)
    db.session.commit()
    return jsonify({"message": "Driver deleted"}), 200