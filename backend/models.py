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
