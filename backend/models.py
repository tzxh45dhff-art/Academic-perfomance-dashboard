from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class UserProfile(BaseModel):
    name: str = Field(description="Name of the user")
    role: str = Field(description="Role of the user")
    institution: str = Field(description="Institution name")

class SubjectStats(BaseModel):
    subject: str = Field(description="Name of the subject")
    mean: float = Field(description="Mean score")
    median: float = Field(description="Median score")
    max: float = Field(description="Maximum score")
    min: float = Field(description="Minimum score")

class StudentRisk(BaseModel):
    student_id: str = Field(description="Unique ID of the student")
    name: str = Field(description="Name of the student")
    risk_score: float = Field(description="Composite risk score based on Z-scores")
    at_risk: bool = Field(description="Flag indicating if the student is at risk")

class MarksWarning(BaseModel):
    student_id: str = Field(description="Unique ID of the student")
    name: str = Field(description="Name of the student")
    marks: float = Field(description="Average marks")

class PerformanceCluster(BaseModel):
    student_id: str = Field(description="Unique ID of the student")
    name: str = Field(description="Name of the student")
    cluster: str = Field(description="Assigned performance tier (e.g., Top Performer, Average, At-Risk)")

class ScoreDistribution(BaseModel):
    subject: str = Field(description="Name of the subject")
    bins: List[str] = Field(description="Score ranges for histogram bins")
    counts: List[int] = Field(description="Number of students in each bin")

class StudentSkillProfile(BaseModel):
    subject: str = Field(description="Subject name")
    score: float = Field(description="Student's score")
    fullMark: float = Field(description="Maximum possible score (e.g., 100)")

class TermProgression(BaseModel):
    term: str = Field(description="Term name")
    class_average: float = Field(description="Class average for the term")
    top_performer_average: float = Field(description="Top performers average")
    at_risk_average: float = Field(description="At-risk students average")

class CorrelationAnalysis(BaseModel):
    student_id: str = Field(description="Student ID")
    attendance: float = Field(description="Simulated attendance %")
    marks: float = Field(description="Average marks")

class CohortMigration(BaseModel):
    term: str = Field(description="Term name")
    top_performer: int = Field(description="Count of top performers")
    average: int = Field(description="Count of average students")
    at_risk: int = Field(description="Count of at-risk students")

# ===== NEW MODELS =====

class StudentRanking(BaseModel):
    rank: int = Field(description="Student rank in class")
    student_id: str = Field(description="Student ID")
    name: str = Field(description="Student name")
    average_score: float = Field(description="Average score across all subjects")
    gpa: float = Field(description="GPA on 4.0 scale")
    percentile: float = Field(description="Percentile rank")
    trend: str = Field(description="Trend direction: improving, stable, or declining")

class ClassHealth(BaseModel):
    overall_score: int = Field(description="Overall class health score 0-100")
    pass_rate: float = Field(description="Percentage of students passing (>=50)")
    engagement_score: int = Field(description="Engagement score 0-100")
    improvement_rate: float = Field(description="Percentage of students who improved")
    avg_gpa: float = Field(description="Class average GPA")
    grade: str = Field(description="Letter grade for class health: A, B, C, D, F")

class SubjectDifficulty(BaseModel):
    subject: str = Field(description="Subject name")
    difficulty_index: float = Field(description="Difficulty index 0-100 (100=hardest)")
    fail_rate: float = Field(description="Percentage of students below 50")
    spread: float = Field(description="Score spread (max - min)")

class AIChatRequest(BaseModel):
    question: str = Field(description="The user's question")
    chat_history: Optional[List[Dict]] = Field(default=None, description="Previous chat messages")

class AIChatResponse(BaseModel):
    response: str = Field(description="The AI's response")

class AIInsightsResponse(BaseModel):
    summary: str = Field(description="Executive summary")
    insights: List[Dict] = Field(description="List of insight objects")

class DashboardAnalyticsResponse(BaseModel):
    overall_students_analyzed: int = Field(description="Total number of unique students processed")
    subject_stats: List[SubjectStats] = Field(description="Statistics broken down by subject")
    score_distributions: List[ScoreDistribution] = Field(description="Score distribution data for frontend charts")
    at_risk_students: List[StudentRisk] = Field(description="List of students flagged as at risk based on Z-scores")
    performance_clusters: List[PerformanceCluster] = Field(description="Students grouped into performance tiers")
    marks_warnings: List[MarksWarning] = Field(description="Students in 40-50 marks bracket")
    student_skill_profile: List[StudentSkillProfile] = Field(description="Data for Radar/Spider chart", default=[])
    term_progression: List[TermProgression] = Field(description="Data for Term over Term multi-line chart", default=[])
    correlation_analysis: List[CorrelationAnalysis] = Field(description="Data for scatter plot", default=[])
    cohort_migration: List[CohortMigration] = Field(description="Data for stacked bar chart", default=[])
    user_profile: UserProfile = Field(description="User profile details")
    # New fields
    student_rankings: List[StudentRanking] = Field(description="Ranked list of students", default=[])
    class_health: Optional[ClassHealth] = Field(description="Overall class health score", default=None)
    subject_difficulty: List[SubjectDifficulty] = Field(description="Difficulty index per subject", default=[])
