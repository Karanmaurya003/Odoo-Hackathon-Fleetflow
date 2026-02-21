# Import the blueprint objects from each file
from .auth import auth_bp
from .trips import trips_bp
from .vehicles import vehicles_bp
from .analytics import analytics_bp
from .drivers import drivers_bp
from .fuel import fuel_bp
from .maintenance import maintenance_bp

# Consolidate them into a single list for app.py
all_blueprints = [
    auth_bp, 
    trips_bp, 
    vehicles_bp, 
    analytics_bp, 
    drivers_bp, 
    fuel_bp, 
    maintenance_bp
]