from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import DashboardAnalyticsResponse
from analytics_service import process_academic_data

app = FastAPI(
    title="Academic Performance Analytics API",
    description="A backend service built with FastAPI, Pandas, and NumPy to analyze student performance.",
    version="1.0.0"
)

# Configure CORS to allow typical React dev environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"], # React/Vite typical ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload", response_model=DashboardAnalyticsResponse)
async def upload_academic_data(file: UploadFile = File(...)):
    """
    Endpoint to receive a CSV file containing academic data, process it,
    and return structured analytics matching the DashboardAnalyticsResponse model.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    try:
        content = await file.read()
        analytics_result = process_academic_data(content)
        return analytics_result
    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
