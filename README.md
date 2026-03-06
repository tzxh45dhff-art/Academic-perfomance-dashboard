# Academic Performance Dashboard

A comprehensive dashboard for tracking and analyzing academic performance, featuring a FastAPI backend and a React (Vite) frontend.

## Project Structure

- `frontend/`: React + TypeScript frontend built with Vite and Tailwind CSS (or Vanilla CSS as per implementation).
- `backend/`: Python FastAPI backend for data processing and analytics.
- `design/`: Project design mockups and prototypes.
- `data/`: Sample data and CSV files (if applicable).

## Getting Started

### Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python main.py
   ```

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Key Features

- **Analytics Service**: Robust processing of student data, including ID hashing and performance metrics.
- **Interactive UI**: Real-time graphs and charts for visualizing academic trends.
- **RESTful API**: Clean separation of concerns between frontend and backend.
