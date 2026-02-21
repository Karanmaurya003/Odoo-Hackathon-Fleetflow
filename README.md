# ⚡ FleetFlow | Modular Fleet & Logistics Management

FleetFlow is a state-of-the-art fleet management system built for the **Odoo Hackathon 2026**. It provides a futuristic "Command Center" interface to manage high-scale logistics, focusing on Role-Based Access Control (RBAC), real-time analytics, and operational efficiency.

## 🚀 Getting Started

Follow these steps to get the system running on your local machine.

### 📋 Prerequisites
* **Python 3.10+**
* **Node.js & npm** (v18+ recommended)
* **MySQL Server**

---

### 🔧 1. Backend Setup (Flask)
The backend handles the API, database migrations, and session-based authentication.

1.  **Navigate to the root directory:**
    ```bash
    cd fleetflow
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv env
    .\env\Scripts\activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install flask flask-sqlalchemy flask-login flask-cors pymysql
    ```
4.  **Database Configuration:**
    * Create a MySQL database named `fleetflow`.
    * Ensure your `config.py` reflects your local MySQL credentials.
5.  **Run the server:**
    ```bash
    python app.py
    ```
    *The backend will start on `http://127.0.0.1:5000`*

---

### 💻 2. Frontend Setup (React)
The UI is a futuristic dashboard that adapts its features based on the logged-in user's permissions.

1.  **Navigate to the UI directory:**
    ```bash
    cd fleetflow_ui
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the development server:**
    ```bash
    npm start
    ```
    *The dashboard will automatically open at `http://localhost:3000`*

---

## 🏗️ Project Structure
```text
fleetflow/
├── app_route/           # Modular API routes (Trips, Vehicles, Fuel, etc.)
├── fleetflow_ui/        # React Frontend Application
│   ├── public/          # index.html and static assets
│   └── src/             # App.jsx (Main Logic), components, and services
├── app.py               # Flask application entry point
├── models.py            # SQLAlchemy database models
└── config.py            # System & Database configuration
