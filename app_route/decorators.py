from functools import wraps
from flask import jsonify
from flask_login import current_user
from models import Role


def roles_required(*roles):
    """Decorator to restrict endpoint access to specific roles."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({"error": "Authentication required"}), 401
            if current_user.role not in roles:
                return jsonify({"error": "Access denied: insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


# Convenience role groups
fleet_manager_only = roles_required(Role.FLEET_MANAGER)
dispatcher_only = roles_required(Role.DISPATCHER)
safety_officer_only = roles_required(Role.SAFETY_OFFICER)
financial_analyst_only = roles_required(Role.FINANCIAL_ANALYST)

# Multi-role
fleet_and_dispatcher = roles_required(Role.FLEET_MANAGER, Role.DISPATCHER)
fleet_and_safety = roles_required(Role.FLEET_MANAGER, Role.SAFETY_OFFICER)
all_roles = roles_required(*Role.ALL)
