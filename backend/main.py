from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from models import DashboardAnalyticsResponse, AIChatRequest, AIChatResponse, AIInsightsResponse
from analytics_service import process_academic_data
from ai_service import generate_insights, chat_with_ai, generate_report_summary
import os

app = FastAPI(
    title="Academic Performance Analytics API",
    description="AI-powered backend service for analyzing student performance with advanced analytics and Gemini AI insights.",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache for last uploaded data (for AI context)
_last_dashboard_data: dict = None

@app.post("/upload", response_model=DashboardAnalyticsResponse)
async def upload_academic_data(file: UploadFile = File(...)):
    """
    Upload a CSV file with academic data and receive comprehensive analytics.
    """
    global _last_dashboard_data
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    try:
        content = await file.read()
        analytics_result = process_academic_data(content)
        _last_dashboard_data = analytics_result
        return analytics_result
    
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/demo", response_model=DashboardAnalyticsResponse)
def load_demo_data():
    """
    Load pre-computed analytics from the test_data.csv file.
    Perfect for demos and presentations.
    """
    global _last_dashboard_data
    
    csv_path = os.path.join(os.path.dirname(__file__), "test_data.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="Demo data file not found.")
    
    try:
        with open(csv_path, "rb") as f:
            content = f.read()
        analytics_result = process_academic_data(content)
        _last_dashboard_data = analytics_result
        return analytics_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading demo data: {str(e)}")

@app.post("/ai/insights", response_model=AIInsightsResponse)
async def get_ai_insights():
    """
    Generate AI-powered insights from the last uploaded data.
    Uses Gemini AI when available, falls back to rule-based insights.
    """
    if not _last_dashboard_data:
        raise HTTPException(status_code=400, detail="No data loaded. Please upload a CSV or load demo data first.")
    
    try:
        result = generate_insights(_last_dashboard_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

@app.post("/ai/chat", response_model=AIChatResponse)
async def ai_chat(request: AIChatRequest):
    """
    Chat with the AI about academic data.
    Uses Gemini AI when available, falls back to rule-based responses.
    """
    if not _last_dashboard_data:
        raise HTTPException(status_code=400, detail="No data loaded. Please upload a CSV or load demo data first.")
    
    try:
        response = chat_with_ai(request.question, _last_dashboard_data, request.chat_history)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in AI chat: {str(e)}")

@app.post("/api/report-summary")
async def download_report():
    """
    Generate a downloadable text report from the current data.
    """
    if not _last_dashboard_data:
        raise HTTPException(status_code=400, detail="No data loaded. Please upload a CSV or load demo data first.")
    
    try:
        report = generate_report_summary(_last_dashboard_data)
        return PlainTextResponse(
            content=report,
            headers={"Content-Disposition": "attachment; filename=academic_report.txt"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": "2.0.0", "ai_available": bool(os.environ.get("GEMINI_API_KEY"))}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
