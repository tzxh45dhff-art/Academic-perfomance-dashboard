import pandas as pd
import numpy as np
import io

def _score_to_gpa(score: float) -> float:
    """Convert a percentage score to 4.0 GPA scale."""
    if score >= 93: return 4.0
    elif score >= 90: return 3.7
    elif score >= 87: return 3.3
    elif score >= 83: return 3.0
    elif score >= 80: return 2.7
    elif score >= 77: return 2.3
    elif score >= 73: return 2.0
    elif score >= 70: return 1.7
    elif score >= 67: return 1.3
    elif score >= 63: return 1.0
    elif score >= 60: return 0.7
    else: return 0.0

def process_academic_data(csv_content: bytes) -> dict:
    """
    Core function to process academic performance data from a CSV file.
    Args:
        csv_content: Raw bytes from the uploaded CSV file.
    Returns:
        dict: Processed analytics matching the DashboardAnalyticsResponse model.
    """
    try:
        df = pd.read_csv(io.BytesIO(csv_content))
        
        # Validate required columns
        required_cols = {'StudentID', 'Name', 'Subject', 'Term', 'Score'}
        if not required_cols.issubset(df.columns):
            raise ValueError(f"Missing required columns. Expected: {required_cols}")

        # Basic Data Cleaning
        df['Score'] = pd.to_numeric(df['Score'], errors='coerce')
        df = df.dropna(subset=['Score'])
        
        df['Term'] = df['Term'].astype(str).str.strip()
        df = df[df['Term'] != '']
        df = df[df['Term'] != 'nan']
        
        # 1. Overall Stats
        total_students = int(df['StudentID'].nunique())

        # 2. Subject-wise Performance Analysis
        subject_grouped = df.groupby('Subject')['Score'].agg(['mean', 'median', 'max', 'min']).reset_index()
        subject_stats = []
        for _, row in subject_grouped.iterrows():
            subject_stats.append({
                "subject": row['Subject'],
                "mean": round(row['mean'], 2),
                "median": round(row['median'], 2),
                "max": row['max'],
                "min": row['min']
            })

        # 3. Score Distribution
        score_distributions = []
        for subject, group in df.groupby('Subject'):
            student_subject_avg = group.groupby('StudentID')['Score'].mean()
            bins = [0, 20, 40, 60, 80, 100]
            labels = ["0-20", "21-40", "41-60", "61-80", "81-100"]
            cuts = pd.cut(student_subject_avg, bins=bins, labels=labels, include_lowest=True)
            counts = cuts.value_counts().sort_index()
            score_distributions.append({
                "subject": subject,
                "bins": labels,
                "counts": counts.tolist()
            })

        # 4. Risk Scoring (Z-score)
        df['SubjectMean'] = df.groupby('Subject')['Score'].transform('mean')
        df['SubjectStd'] = df.groupby('Subject')['Score'].transform('std')
        df['SubjectStd'] = df['SubjectStd'].replace({0: np.nan, np.nan: 1}) 
        df['ZScore'] = (df['Score'] - df['SubjectMean']) / df['SubjectStd']
        
        student_zscores = df.groupby(['StudentID', 'Name'])['ZScore'].mean().reset_index()
        
        at_risk_list = []
        for _, row in student_zscores.iterrows():
            risk_score = row['ZScore']
            is_at_risk = bool(risk_score < -1.0) 
            if is_at_risk:
                at_risk_list.append({
                    "student_id": str(row['StudentID']),
                    "name": row['Name'],
                    "risk_score": round(risk_score, 2),
                    "at_risk": is_at_risk
                })

        # 5. Performance Clustering
        student_avg_scores = df.groupby(['StudentID', 'Name'])['Score'].mean().reset_index()
        
        try:
            student_avg_scores['Cluster'] = pd.qcut(
                student_avg_scores['Score'], 
                q=3, 
                labels=["At-Risk", "Average", "Top Performer"]
            )
        except ValueError:
             student_avg_scores['Cluster'] = pd.cut(
                student_avg_scores['Score'], 
                bins=[0, 50, 80, 100], 
                labels=["At-Risk", "Average", "Top Performer"],
                include_lowest=True
            )

        performance_clusters = []
        for _, row in student_avg_scores.iterrows():
            performance_clusters.append({
                "student_id": str(row['StudentID']),
                "name": row['Name'],
                "cluster": str(row['Cluster'])
            })

        # 6. Marks Warning (40-50 bracket)
        student_avg_scores_warnings = df.groupby(['StudentID', 'Name'])['Score'].mean().reset_index()
        marks_warnings = []
        for _, row in student_avg_scores_warnings.iterrows():
            avg_score = row['Score']
            if 40 <= avg_score <= 50:
                marks_warnings.append({
                    "student_id": str(row['StudentID']),
                    "name": row['Name'],
                    "marks": round(avg_score, 1)
                })

        # 7. Student Skill Profile (Radar Chart)
        top_student_id = student_avg_scores.loc[student_avg_scores['Score'].idxmax()]['StudentID']
        top_student_data = df[df['StudentID'] == top_student_id].groupby('Subject')['Score'].mean().reset_index()
        student_skill_profile = [
            {"subject": row['Subject'], "score": round(row['Score'], 1), "fullMark": 100} 
            for _, row in top_student_data.iterrows()
        ]

        # 8. Term Progression
        term_progression = []
        for term, term_group in df.groupby('Term'):
            class_avg = term_group['Score'].mean()
            merged = term_group.merge(student_avg_scores[['StudentID', 'Cluster']], on='StudentID', how='left')
            top_avg = merged[merged['Cluster'] == 'Top Performer']['Score'].mean()
            risk_avg = merged[merged['Cluster'] == 'At-Risk']['Score'].mean()
            
            term_name = str(term)
                
            term_progression.append({
                "term": term_name,
                "class_average": round(float(class_avg), 1) if pd.notna(class_avg) else 0.0,
                "top_performer_average": round(float(top_avg), 1) if pd.notna(top_avg) else 0.0,
                "at_risk_average": round(float(risk_avg), 1) if pd.notna(risk_avg) else 0.0
            })

        # 9. Correlation Analysis (Scatter Plot)
        correlation_analysis = []
        for _, row in student_avg_scores.iterrows():
            avg_score = row['Score']
            student_id_str = str(row['StudentID'])
            seed_val = abs(hash(student_id_str)) % (2**32)
            np.random.seed(seed_val)
            simulated_attendance = min(100, max(40, avg_score + np.random.normal(0, 8)))
            if avg_score > 90: simulated_attendance = max(simulated_attendance, 95)
            correlation_analysis.append({
                "student_id": student_id_str,
                "attendance": round(simulated_attendance, 1),
                "marks": round(avg_score, 1)
            })

        # 10. Cohort Migration
        cohort_migration = []
        term_student_avg = df.groupby(['Term', 'StudentID'])['Score'].mean().reset_index()
        for term, term_group in term_student_avg.groupby('Term'):
            top_count = 0
            avg_count = 0
            risk_count = 0
            for score in term_group['Score']:
                if score >= 80: top_count += 1
                elif score >= 50: avg_count += 1
                else: risk_count += 1
                
            term_name = str(term)
                
            cohort_migration.append({
                "term": term_name,
                "top_performer": top_count,
                "average": avg_count,
                "at_risk": risk_count
            })

        # ===== NEW ANALYTICS =====

        # 11. Student Rankings with GPA
        terms = sorted(df['Term'].unique())
        student_rankings = []
        for _, row in student_avg_scores.sort_values('Score', ascending=False).iterrows():
            sid = row['StudentID']
            avg = round(row['Score'], 1)
            gpa = round(_score_to_gpa(avg), 2)
            
            # Calculate trend from term data
            student_terms = df[df['StudentID'] == sid].groupby('Term')['Score'].mean()
            if len(student_terms) >= 2:
                sorted_terms = student_terms.reindex(terms).dropna()
                if len(sorted_terms) >= 2:
                    first_half = sorted_terms.iloc[:len(sorted_terms)//2].mean()
                    second_half = sorted_terms.iloc[len(sorted_terms)//2:].mean()
                    diff = second_half - first_half
                    if diff > 3:
                        trend = "improving"
                    elif diff < -3:
                        trend = "declining"
                    else:
                        trend = "stable"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Percentile
            percentile = round((student_avg_scores['Score'] < avg).mean() * 100, 0)
            
            student_rankings.append({
                "rank": 0,  # Will set after sorting
                "student_id": str(sid),
                "name": row['Name'],
                "average_score": avg,
                "gpa": gpa,
                "percentile": percentile,
                "trend": trend
            })
        
        # Set ranks
        for i, r in enumerate(student_rankings):
            r['rank'] = i + 1

        # 12. Class Health Score
        pass_count = len(student_avg_scores[student_avg_scores['Score'] >= 50])
        pass_rate = round((pass_count / total_students) * 100, 1) if total_students > 0 else 0
        
        # Calculate improvement rate
        improving_count = len([r for r in student_rankings if r['trend'] == 'improving'])
        improvement_rate = round((improving_count / total_students) * 100, 1) if total_students > 0 else 0
        
        avg_gpa = round(sum(r['gpa'] for r in student_rankings) / len(student_rankings), 2) if student_rankings else 0
        
        # Engagement score (simulated based on attendance correlation)
        avg_attendance = sum(c['attendance'] for c in correlation_analysis) / len(correlation_analysis) if correlation_analysis else 0
        engagement_score = min(100, int(avg_attendance * 1.05))
        
        # Overall health = weighted composite
        overall_avg = sum(s['mean'] for s in subject_stats) / len(subject_stats) if subject_stats else 0
        health_score = int(
            overall_avg * 0.35 + 
            pass_rate * 0.25 + 
            engagement_score * 0.2 + 
            improvement_rate * 0.2
        )
        health_score = min(100, max(0, health_score))
        
        # Letter grade
        if health_score >= 90: grade = "A"
        elif health_score >= 80: grade = "B"
        elif health_score >= 70: grade = "C"
        elif health_score >= 60: grade = "D"
        else: grade = "F"
        
        class_health = {
            "overall_score": health_score,
            "pass_rate": pass_rate,
            "engagement_score": engagement_score,
            "improvement_rate": improvement_rate,
            "avg_gpa": avg_gpa,
            "grade": grade
        }

        # 13. Subject Difficulty Index
        subject_difficulty = []
        for subject, group in df.groupby('Subject'):
            student_subj_avg = group.groupby('StudentID')['Score'].mean()
            fail_count = len(student_subj_avg[student_subj_avg < 50])
            fail_rate = round((fail_count / len(student_subj_avg)) * 100, 1)
            spread = float(student_subj_avg.max() - student_subj_avg.min())
            # Difficulty = inverse of mean + fail rate factor
            mean_score = student_subj_avg.mean()
            difficulty = round(100 - mean_score + fail_rate * 0.3, 1)
            difficulty = min(100, max(0, difficulty))
            
            subject_difficulty.append({
                "subject": subject,
                "difficulty_index": difficulty,
                "fail_rate": fail_rate,
                "spread": round(spread, 1)
            })

        return {
            "overall_students_analyzed": total_students,
            "subject_stats": subject_stats,
            "score_distributions": score_distributions,
            "at_risk_students": at_risk_list,
            "performance_clusters": performance_clusters,
            "marks_warnings": marks_warnings,
            "student_skill_profile": student_skill_profile,
            "term_progression": term_progression,
            "correlation_analysis": correlation_analysis,
            "cohort_migration": cohort_migration,
            "user_profile": {
                "name": "Rachit Goyal",
                "role": "Lead Educator",
                "institution": "Tech Innovators Academy"
            },
            # New data
            "student_rankings": student_rankings,
            "class_health": class_health,
            "subject_difficulty": subject_difficulty
        }

    except Exception as e:
        raise ValueError(f"Error processing data: {str(e)}")
