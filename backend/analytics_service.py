import pandas as pd
import numpy as np
import io

def process_academic_data(csv_content: bytes) -> dict:
    """
    Core function to process academic performance data from a CSV file.
    Args:
        csv_content: Raw bytes from the uploaded CSV file.
    Returns:
        dict: Processed analytics matching the DashboardAnalyticsResponse model.
    """
    try:
        # Load data, handling encoding and missing values
        df = pd.read_csv(io.BytesIO(csv_content))
        
        # Validate required columns
        required_cols = {'StudentID', 'Name', 'Subject', 'Term', 'Score'}
        if not required_cols.issubset(df.columns):
            raise ValueError(f"Missing required columns. Expected: {required_cols}")

        # Basic Data Cleaning
        df['Score'] = pd.to_numeric(df['Score'], errors='coerce')
        df = df.dropna(subset=['Score']) # Drop rows where score couldn't be parsed
        
        # Keep terms as strings, stripping whitespace to normalize, drop empty
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

        # 3. Score Distribution (Percentiles/Bins for histograms)
        score_distributions = []
        for subject, group in df.groupby('Subject'):
            # Average the scores per student for this subject so our histogram reflects student population
            student_subject_avg = group.groupby('StudentID')['Score'].mean()
            
            # Define bins: 0-20, 20-40, ..., 80-100
            bins = [0, 20, 40, 60, 80, 100]
            labels = ["0-20", "21-40", "41-60", "61-80", "81-100"]
            
            # Use pd.cut to bin the data
            cuts = pd.cut(student_subject_avg, bins=bins, labels=labels, include_lowest=True)
            counts = cuts.value_counts().sort_index()
            
            score_distributions.append({
                "subject": subject,
                "bins": labels,
                "counts": counts.tolist()
            })

        # 4. Risk Scoring Mechanism (Z-score via NumPy)
        # Calculate Z-score for each student per subject relative to class average
        df['SubjectMean'] = df.groupby('Subject')['Score'].transform('mean')
        df['SubjectStd'] = df.groupby('Subject')['Score'].transform('std')
        
        # Handle cases where std is 0 (all scores same) or NaN (only one score) to avoid division by zero
        df['SubjectStd'] = df['SubjectStd'].replace({0: np.nan, np.nan: 1}) 
        
        df['ZScore'] = (df['Score'] - df['SubjectMean']) / df['SubjectStd']
        
        # A student is flagged if average Z-score across subjects is significantly below 0 (e.g., < -1.0)
        student_zscores = df.groupby(['StudentID', 'Name'])['ZScore'].mean().reset_index()
        
        at_risk_list = []
        for _, row in student_zscores.iterrows():
            risk_score = row['ZScore']
            # Flag if average z-score is lower than -1 (1 standard dev below avg overall)
            is_at_risk = bool(risk_score < -1.0) 
            
            # Optionally, we only report those actually at risk to keep payload small, 
            # but model allows reporting all if needed. Let's send only flagged to save bandwidth.
            if is_at_risk:
                at_risk_list.append({
                    "student_id": str(row['StudentID']),
                    "name": row['Name'],
                    "risk_score": round(risk_score, 2),
                    "at_risk": is_at_risk
                })

        # 5. Performance Clustering (Quantile binning over average score)
        student_avg_scores = df.groupby(['StudentID', 'Name'])['Score'].mean().reset_index()
        
        # Group into 3 tiers based on quantiles (Top 33%, Middle 33%, Bottom 33%)
        # qcut requires unique bin edges, fallback to cut if data is too uniform
        try:
            student_avg_scores['Cluster'] = pd.qcut(
                student_avg_scores['Score'], 
                q=3, 
                labels=["At-Risk", "Average", "Top Performer"]
            )
        except ValueError:
             # Fallback if qcut fails due to duplicate edges (e.g. everyone gets 100)
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

        # 8. Term Progression (Multi-Line Chart)
        term_progression = []
        for term, term_group in df.groupby('Term'):
            class_avg = term_group['Score'].mean()
            merged = term_group.merge(student_avg_scores[['StudentID', 'Cluster']], on='StudentID', how='left')
            top_avg = merged[merged['Cluster'] == 'Top Performer']['Score'].mean()
            risk_avg = merged[merged['Cluster'] == 'At-Risk']['Score'].mean()
            
            # Handle 'term' formatting
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
            # Simulate attendance based on score for demo
            
            # Use hash of StudentID instead of int() to support alphanumeric IDs like S00001
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

        # 10. Cohort Migration (Stacked Bar Chart)
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
                
            # Handle 'term' formatting
            term_name = str(term)
                
            cohort_migration.append({
                "term": term_name,
                "top_performer": top_count,
                "average": avg_count,
                "at_risk": risk_count
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
            }
        }

    except Exception as e:
        # In a real app we'd log this properly
        raise ValueError(f"Error processing data: {str(e)}")
