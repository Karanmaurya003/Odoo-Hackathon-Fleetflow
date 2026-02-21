from flask import Blueprint, jsonify, request
from flask_login import login_required
from sqlalchemy import func
from models import db, Vehicle, Driver, Trip, FuelLog, Maintenance, VehicleStatus, TripStatus
from app_route.decorators import roles_required
from models import Role

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("/utilization", methods=["GET"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.DISPATCHER, Role.FINANCIAL_ANALYST)
def utilization_rate():
    """Utilization Rate = (OnTrip Vehicles / Total Vehicles) * 100"""
    total = Vehicle.query.count()
    on_trip = Vehicle.query.filter_by(status=VehicleStatus.ON_TRIP).count()
    in_shop = Vehicle.query.filter_by(status="InShop").count()
    available = Vehicle.query.filter_by(status=VehicleStatus.AVAILABLE).count()
    retired = Vehicle.query.filter_by(status="Retired").count()

    utilization = round((on_trip / total * 100), 2) if total > 0 else 0.0

    return jsonify({
        "total_vehicles": total,
        "on_trip": on_trip,
        "available": available,
        "in_shop": in_shop,
        "retired": retired,
        "utilization_rate_percent": utilization,
    }), 200


@analytics_bp.route("/fuel-efficiency", methods=["GET"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.SAFETY_OFFICER, Role.FINANCIAL_ANALYST)
def fuel_efficiency():
    """Fuel Efficiency = total_km / total_liters (fleet-wide and per vehicle)"""
    vehicle_id = request.args.get("vehicle_id", type=int)

    # Completed trips for km
    trip_query = Trip.query.filter_by(status=TripStatus.COMPLETED)
    fuel_query = FuelLog.query

    if vehicle_id:
        trip_query = trip_query.filter_by(vehicle_id=vehicle_id)
        fuel_query = fuel_query.filter_by(vehicle_id=vehicle_id)

    trips = trip_query.all()
    total_km = sum(t.distance() or 0 for t in trips)

    total_liters = db.session.query(func.sum(FuelLog.liters))
    if vehicle_id:
        total_liters = total_liters.filter(FuelLog.vehicle_id == vehicle_id)
    total_liters = total_liters.scalar() or 0

    total_fuel_cost = db.session.query(func.sum(FuelLog.cost))
    if vehicle_id:
        total_fuel_cost = total_fuel_cost.filter(FuelLog.vehicle_id == vehicle_id)
    total_fuel_cost = total_fuel_cost.scalar() or 0

    efficiency = round(total_km / total_liters, 4) if total_liters > 0 else None

    return jsonify({
        "scope": f"vehicle_{vehicle_id}" if vehicle_id else "fleet",
        "total_km": total_km,
        "total_liters": total_liters,
        "total_fuel_cost": total_fuel_cost,
        "fuel_efficiency_km_per_liter": efficiency,
    }), 200


@analytics_bp.route("/operational-cost", methods=["GET"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.FINANCIAL_ANALYST)
def operational_cost():
    """Total Operational Cost = Fuel + Maintenance"""
    vehicle_id = request.args.get("vehicle_id", type=int)

    fuel_q = db.session.query(func.sum(FuelLog.cost))
    maint_q = db.session.query(func.sum(Maintenance.cost))

    if vehicle_id:
        fuel_q = fuel_q.filter(FuelLog.vehicle_id == vehicle_id)
        maint_q = maint_q.filter(Maintenance.vehicle_id == vehicle_id)

    total_fuel = fuel_q.scalar() or 0
    total_maintenance = maint_q.scalar() or 0
    total_operational = total_fuel + total_maintenance

    return jsonify({
        "scope": f"vehicle_{vehicle_id}" if vehicle_id else "fleet",
        "fuel_cost": round(total_fuel, 2),
        "maintenance_cost": round(total_maintenance, 2),
        "total_operational_cost": round(total_operational, 2),
    }), 200


@analytics_bp.route("/roi", methods=["GET"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.FINANCIAL_ANALYST)
def roi_per_vehicle():
    """ROI per vehicle = (Revenue - (Maintenance + Fuel)) / acquisition_cost"""
    vehicles = Vehicle.query.all()
    results = []

    for v in vehicles:
        revenue = db.session.query(func.sum(Trip.revenue)).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.COMPLETED,
        ).scalar() or 0

        fuel_cost = db.session.query(func.sum(FuelLog.cost)).filter(
            FuelLog.vehicle_id == v.id
        ).scalar() or 0

        maint_cost = db.session.query(func.sum(Maintenance.cost)).filter(
            Maintenance.vehicle_id == v.id
        ).scalar() or 0

        total_cost = fuel_cost + maint_cost
        net_profit = revenue - total_cost
        roi = round(net_profit / v.acquisition_cost, 4) if v.acquisition_cost > 0 else None

        results.append({
            "vehicle_id": v.id,
            "vehicle_name": v.name,
            "license_plate": v.license_plate,
            "acquisition_cost": v.acquisition_cost,
            "total_revenue": round(revenue, 2),
            "total_fuel_cost": round(fuel_cost, 2),
            "total_maintenance_cost": round(maint_cost, 2),
            "total_operational_cost": round(total_cost, 2),
            "net_profit": round(net_profit, 2),
            "roi": roi,
        })

    # Sort by ROI descending
    results.sort(key=lambda x: (x["roi"] is not None, x["roi"] or 0), reverse=True)

    fleet_revenue = sum(r["total_revenue"] for r in results)
    fleet_cost = sum(r["total_operational_cost"] for r in results)

    return jsonify({
        "vehicles": results,
        "fleet_summary": {
            "total_revenue": round(fleet_revenue, 2),
            "total_operational_cost": round(fleet_cost, 2),
            "net_profit": round(fleet_revenue - fleet_cost, 2),
        },
    }), 200


@analytics_bp.route("/dashboard", methods=["GET"])
@login_required
@roles_required(Role.FLEET_MANAGER, Role.FINANCIAL_ANALYST)
def dashboard():
    """Combined dashboard summary."""
    total_vehicles = Vehicle.query.count()
    on_trip = Vehicle.query.filter_by(status=VehicleStatus.ON_TRIP).count()
    utilization = round((on_trip / total_vehicles * 100), 2) if total_vehicles > 0 else 0

    total_fuel = db.session.query(func.sum(FuelLog.cost)).scalar() or 0
    total_maint = db.session.query(func.sum(Maintenance.cost)).scalar() or 0
    total_revenue = db.session.query(func.sum(Trip.revenue)).filter(
        Trip.status == TripStatus.COMPLETED
    ).scalar() or 0

    total_liters = db.session.query(func.sum(FuelLog.liters)).scalar() or 0
    completed_trips = Trip.query.filter_by(status=TripStatus.COMPLETED).all()
    total_km = sum(t.distance() or 0 for t in completed_trips)
    fuel_eff = round(total_km / total_liters, 4) if total_liters > 0 else None

    return jsonify({
        "fleet": {
            "total_vehicles": total_vehicles,
            "on_trip": on_trip,
            "utilization_rate_percent": utilization,
            "total_drivers": Driver.query.count(),
        },
        "trips": {
            "total": Trip.query.count(),
            "completed": len(completed_trips),
            "dispatched": Trip.query.filter_by(status=TripStatus.DISPATCHED).count(),
            "cancelled": Trip.query.filter_by(status=TripStatus.CANCELLED).count(),
            "total_km": round(total_km, 2),
        },
        "financials": {
            "total_revenue": round(total_revenue, 2),
            "total_fuel_cost": round(total_fuel, 2),
            "total_maintenance_cost": round(total_maint, 2),
            "total_operational_cost": round(total_fuel + total_maint, 2),
            "net_profit": round(total_revenue - total_fuel - total_maint, 2),
        },
        "efficiency": {
            "fuel_efficiency_km_per_liter": fuel_eff,
            "total_liters": total_liters,
        },
    }), 200
