import os
from flask import Flask, jsonify
from flask_login import LoginManager
from models import db, User
from config import config
from app_route import all_blueprints


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # ── Extensions ──────────────────────────────────────────
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({"error": "Authentication required. Please log in."}), 401

    # ── Blueprints ───────────────────────────────────────────
    for bp in all_blueprints:
        app.register_blueprint(bp)

    # ── Global error handlers ────────────────────────────────
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad request", "message": str(e)}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "message": str(e)}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(e):
        db.session.rollback()
        return jsonify({"error": "Internal server error"}), 500

    # ── Health check ─────────────────────────────────────────
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "FleetFlow"}), 200

    # ── Create tables ─────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin(app)
    for rule in app.url_map.iter_rules():
        print(f"Route: {rule.rule} --> Endpoint: {rule.endpoint}")
    return app


def _seed_admin(app: Flask):
    """Create a default FleetManager account if no users exist."""
    with app.app_context():
        if User.query.count() == 0:
            admin = User(
                name="Admin",
                email="admin@fleetflow.com",
                role="FleetManager",
            )
            admin.set_password("Admin@123")
            db.session.add(admin)
            db.session.commit()
            print("✅  Default admin created: admin@fleetflow.com / Admin@123")


if __name__ == "__main__":
    env = os.environ.get("FLASK_ENV", "development")
    application = create_app(env)
    application.run(host="0.0.0.0", port=5000, debug=(env == "development"))
