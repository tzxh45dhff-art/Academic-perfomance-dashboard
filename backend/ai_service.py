"""
AI Service for Academic Performance Dashboard
Uses Google Gemini API for generating insights and handling academic chat.
Gracefully falls back when API key is not configured.
"""
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Try to import Google Generative AI
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

def _get_model():
    """Get configured Gemini model or None if not available."""
    if not GENAI_AVAILABLE or not GEMINI_API_KEY:
        return None
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.0-flash")

def _build_data_context(dashboard_data: dict) -> str:
    """Build a concise text summary of dashboard data for AI context."""
    ctx = []
    ctx.append(f"Total Students Analyzed: {dashboard_data.get('overall_students_analyzed', 0)}")
    
    # Subject stats
    for s in dashboard_data.get('subject_stats', []):
        ctx.append(f"Subject: {s.get('subject', 'Unknown')} — Mean: {s.get('mean', 'N/A')}, Median: {s.get('median', 'N/A')}, Max: {s.get('max', 'N/A')}, Min: {s.get('min', 'N/A')}")
    
    # At-risk students
    at_risk = dashboard_data.get('at_risk_students', [])
    if at_risk:
        ctx.append(f"\nAt-Risk Students ({len(at_risk)}):")
        for s in at_risk:
            ctx.append(f"  - {s.get('name', 'Unknown')} (ID: {s.get('student_id', 'Unknown')}, Z-Score: {s.get('risk_score', 'N/A')})")
    
    # Performance clusters
    clusters = dashboard_data.get('performance_clusters', [])
    top = [c for c in clusters if c.get('cluster') == 'Top Performer']
    avg = [c for c in clusters if c.get('cluster') == 'Average']
    risk = [c for c in clusters if c.get('cluster') == 'At-Risk']
    ctx.append(f"\nPerformance Tiers: {len(top)} Top Performers, {len(avg)} Average, {len(risk)} At-Risk")
    
    # Term progression
    for t in dashboard_data.get('term_progression', []):
        ctx.append(f"Term {t.get('term', 'Unknown')}: Class Avg={t.get('class_average', 'N/A')}, Top={t.get('top_performer_average', 'N/A')}, At-Risk={t.get('at_risk_average', 'N/A')}")
    
    # Rankings
    for r in dashboard_data.get('student_rankings', []):
        ctx.append(f"Rank #{r.get('rank', 'N/A')}: {r.get('name', 'Unknown')} — GPA: {r.get('gpa', 'N/A')}, Avg: {r.get('average_score', 'N/A')}, Trend: {r.get('trend', 'N/A')}")
    
    # Class health
    health = dashboard_data.get('class_health', {})
    if health:
        ctx.append(f"\nClass Health Score: {health.get('overall_score', 'N/A')}/100")
        ctx.append(f"  Pass Rate: {health.get('pass_rate', 'N/A')}%")
        ctx.append(f"  Engagement: {health.get('engagement_score', 'N/A')}/100")
        ctx.append(f"  Improvement Rate: {health.get('improvement_rate', 'N/A')}%")
    
    return "\n".join(ctx)


def generate_insights(dashboard_data: dict) -> dict:
    """
    Generate AI-powered insights from dashboard data.
    Returns a dict with 'insights' list and 'summary' string.
    """
    model = _get_model()
    data_context = _build_data_context(dashboard_data)
    
    if not model:
        # Fallback: Generate rule-based insights
        return _generate_rule_based_insights(dashboard_data)
    
    try:
        prompt = f"""You are an expert academic analytics advisor. Analyze this student performance data and provide exactly 6 actionable insights.

DATA:
{data_context}

Respond in this exact JSON format (no markdown, no code fences):
{{
  "summary": "A 2-sentence executive summary of overall class performance.",
  "insights": [
    {{
      "category": "strength|weakness|opportunity|warning|trend|recommendation",
      "title": "Short insight title (max 8 words)",
      "description": "1-2 sentence detailed insight.",
      "priority": "high|medium|low"
    }}
  ]
}}

Generate exactly 6 insights covering: 1 strength, 1 weakness, 1 opportunity, 1 warning, 1 trend observation, 1 specific recommendation."""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            elif "```" in text:
                text = text[:text.rfind("```")]
        
        result = json.loads(text.strip())
        return result
    except Exception as e:
        print(f"AI Insight generation failed: {e}")
        return _generate_rule_based_insights(dashboard_data)


def chat_with_ai(question: str, dashboard_data: dict, chat_history: list = None) -> str:
    """
    Handle a chat question about academic data.
    Returns the AI response string.
    """
    model = _get_model()
    data_context = _build_data_context(dashboard_data)
    
    if not model:
        return _rule_based_chat(question, dashboard_data)
    
    try:
        history_text = ""
        if chat_history:
            for msg in chat_history[-6:]:  # Last 6 messages for context
                role = "User" if msg.get("role") == "user" else "Assistant"
                history_text += f"{role}: {msg.get('content', '')}\n"
        
        prompt = f"""You are an AI academic advisor assistant for a school dashboard. You have access to the following student performance data:

{data_context}

{f"Previous conversation:{chr(10)}{history_text}" if history_text else ""}

Answer the following question concisely and helpfully. Use specific numbers from the data. If asking about a specific student, reference their actual scores. Keep responses under 150 words. Use markdown formatting for clarity.

Question: {question}"""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"AI Chat failed: {e}")
        return _rule_based_chat(question, dashboard_data)


def generate_report_summary(dashboard_data: dict) -> str:
    """Generate a downloadable text report summary."""
    model = _get_model()
    data_context = _build_data_context(dashboard_data)
    
    if not model:
        return _generate_static_report(dashboard_data)
    
    try:
        prompt = f"""Generate a professional academic performance report based on this data:

{data_context}

Format it as a clean text report with these sections:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. KEY METRICS (bullet points)
3. STUDENT PERFORMANCE ANALYSIS (brief paragraph)
4. AT-RISK STUDENT ALERTS (if any)
5. RECOMMENDATIONS (3-5 actionable items)
6. CONCLUSION

Keep it concise but comprehensive. Use plain text formatting."""

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return _generate_static_report(dashboard_data)


def _generate_rule_based_insights(data: dict) -> dict:
    """Generate insights using rules when AI is unavailable."""
    insights = []
    stats = data.get('subject_stats', [])
    at_risk = data.get('at_risk_students', [])
    clusters = data.get('performance_clusters', [])
    term_prog = data.get('term_progression', [])
    rankings = data.get('student_rankings', [])
    health = data.get('class_health', {})
    
    # Calculate overall average
    overall_avg = sum(s['mean'] for s in stats) / len(stats) if stats else 0
    
    # Best subject
    if stats:
        best = max(stats, key=lambda s: s['mean'])
        insights.append({
            "category": "strength",
            "title": f"{best['subject']} leads with {best['mean']}% avg",
            "description": f"{best['subject']} is the strongest subject with a class average of {best['mean']}% and a top score of {best['max']}.",
            "priority": "medium"
        })
    
    # Weakest subject
    if stats:
        worst = min(stats, key=lambda s: s['mean'])
        insights.append({
            "category": "weakness",
            "title": f"{worst['subject']} needs attention at {worst['mean']}%",
            "description": f"{worst['subject']} has the lowest class average at {worst['mean']}% with a minimum score of {worst['min']}. Consider additional support resources.",
            "priority": "high"
        })
    
    # At-risk alert
    if at_risk:
        insights.append({
            "category": "warning",
            "title": f"{len(at_risk)} students flagged at-risk",
            "description": f"{', '.join(s['name'] for s in at_risk[:3])} {'and others are' if len(at_risk) > 3 else 'are' if len(at_risk) > 1 else 'is'} performing significantly below the class average and require immediate intervention.",
            "priority": "high"
        })
    else:
        insights.append({
            "category": "strength",
            "title": "No students currently at-risk",
            "description": "All students are performing within acceptable ranges. Continue monitoring to maintain this positive trend.",
            "priority": "low"
        })
    
    # Trend analysis
    if len(term_prog) >= 2:
        first_avg = term_prog[0]['class_average']
        last_avg = term_prog[-1]['class_average']
        diff = last_avg - first_avg
        if diff > 0:
            insights.append({
                "category": "trend",
                "title": f"Class average trending up by {abs(diff):.1f}%",
                "description": f"The class average improved from {first_avg}% to {last_avg}% across terms, indicating effective teaching strategies.",
                "priority": "medium"
            })
        else:
            insights.append({
                "category": "trend",
                "title": f"Class average declining by {abs(diff):.1f}%",
                "description": f"The class average dropped from {first_avg}% to {last_avg}% across terms. Review curriculum pacing and student engagement.",
                "priority": "high"
            })
    
    # Opportunity
    top_count = len([c for c in clusters if c['cluster'] == 'Top Performer'])
    total = len(clusters) if clusters else 1
    insights.append({
        "category": "opportunity",
        "title": f"{round(top_count/total*100)}% students are top performers",
        "description": f"With {top_count} out of {total} students in the top tier, there's opportunity to challenge advanced students with enrichment programs.",
        "priority": "medium"
    })
    
    # Recommendation
    if rankings:
        top_student = rankings[0] if rankings else None
        if top_student:
            insights.append({
                "category": "recommendation",
                "title": "Implement peer tutoring program",
                "description": f"Top performer {top_student['name']} (GPA: {top_student['gpa']}) could mentor at-risk students. Peer learning improves outcomes for both groups.",
                "priority": "medium"
            })
    else:
        insights.append({
            "category": "recommendation",
            "title": "Consider differentiated instruction",
            "description": "With varying performance levels, differentiated teaching strategies could help close the gap between top performers and struggling students.",
            "priority": "medium"
        })
    
    summary = f"The class of {data.get('overall_students_analyzed', 0)} students shows an overall average of {overall_avg:.1f}%. "
    if at_risk:
        summary += f"{len(at_risk)} student(s) require immediate intervention due to performance significantly below cohort average."
    else:
        summary += "All students are performing within acceptable ranges with positive engagement indicators."
    
    return {
        "summary": summary,
        "insights": insights[:6]
    }


def _rule_based_chat(question: str, data: dict) -> str:
    """Provide rule-based chat responses when AI is unavailable."""
    q = question.lower()
    stats = data.get('subject_stats', [])
    at_risk = data.get('at_risk_students', [])
    clusters = data.get('performance_clusters', [])
    rankings = data.get('student_rankings', [])
    
    if any(w in q for w in ['best', 'top', 'highest', 'leader']):
        if rankings:
            top = rankings[0]
            return f"🏆 **{top['name']}** is the top performer with a **GPA of {top['gpa']}** and an average score of **{top['average_score']}%** (Percentile: {top['percentile']}th)."
        if stats:
            best = max(stats, key=lambda s: s['mean'])
            return f"📊 **{best['subject']}** has the highest class average at **{best['mean']}%** with a top score of **{best['max']}**."
    
    if any(w in q for w in ['worst', 'weak', 'lowest', 'struggle', 'poor']):
        if stats:
            worst = min(stats, key=lambda s: s['mean'])
            return f"⚠️ **{worst['subject']}** has the lowest class average at **{worst['mean']}%** (min score: {worst['min']}). This subject may need additional teaching resources."
    
    if any(w in q for w in ['risk', 'danger', 'failing', 'concern', 'alert']):
        if at_risk:
            names = ', '.join(s['name'] for s in at_risk)
            return f"🚨 **{len(at_risk)} student(s) are at-risk:** {names}. Their Z-scores indicate performance significantly below the class average. Immediate intervention is recommended."
        return "✅ Great news! No students are currently flagged as at-risk. All students are performing within acceptable ranges."
    
    if any(w in q for w in ['how many', 'total', 'count', 'number']):
        total = data.get('overall_students_analyzed', 0)
        top_count = len([c for c in clusters if c['cluster'] == 'Top Performer'])
        avg_count = len([c for c in clusters if c['cluster'] == 'Average'])
        risk_count = len([c for c in clusters if c['cluster'] == 'At-Risk'])
        return f"📊 **{total} students** analyzed:\n- 🟢 Top Performers: **{top_count}**\n- 🔵 Average: **{avg_count}**\n- 🔴 At-Risk: **{risk_count}**"
    
    if any(w in q for w in ['gpa', 'grade point']):
        if rankings:
            gpas = [r['gpa'] for r in rankings]
            avg_gpa = sum(gpas) / len(gpas)
            return f"📚 **Class Average GPA: {avg_gpa:.2f}**\n\nGPA Range: {min(gpas):.2f} – {max(gpas):.2f}\n\nTop: {rankings[0]['name']} ({rankings[0]['gpa']})"
    
    if any(w in q for w in ['improve', 'recommend', 'suggest', 'help']):
        return "💡 **Recommendations:**\n1. Implement peer tutoring pairing top performers with at-risk students\n2. Schedule weekly check-ins with borderline students (40-50 marks)\n3. Create subject-specific study groups for weaker subjects\n4. Consider differentiated assignments based on performance tiers\n5. Set up parent communication for at-risk students"
    
    # Default response
    overall_avg = sum(s['mean'] for s in stats) / len(stats) if stats else 0
    return f"📊 Based on the data: **{data.get('overall_students_analyzed', 0)} students** analyzed with an overall class average of **{overall_avg:.1f}%**. Try asking about specific topics like 'top performers', 'at-risk students', 'GPA', or 'recommendations'."


def _generate_static_report(data: dict) -> str:
    """Generate a static text report when AI is unavailable."""
    stats = data.get('subject_stats', [])
    at_risk = data.get('at_risk_students', [])
    clusters = data.get('performance_clusters', [])
    rankings = data.get('student_rankings', [])
    health = data.get('class_health', {})
    overall_avg = sum(s['mean'] for s in stats) / len(stats) if stats else 0
    
    report = []
    report.append("=" * 60)
    report.append("    ACADEMIC PERFORMANCE ANALYSIS REPORT")
    report.append("    Generated by Academic Dashboard AI")
    report.append("=" * 60)
    report.append("")
    
    report.append("1. EXECUTIVE SUMMARY")
    report.append("-" * 40)
    report.append(f"Analysis of {data.get('overall_students_analyzed', 0)} students across {len(stats)} subjects.")
    report.append(f"Overall class average: {overall_avg:.1f}%")
    if health:
        report.append(f"Class Health Score: {health.get('overall_score', 'N/A')}/100")
    report.append("")
    
    report.append("2. KEY METRICS")
    report.append("-" * 40)
    for s in stats:
        report.append(f"  • {s['subject']}: Mean={s['mean']}%, Median={s['median']}%, Range=[{s['min']}-{s['max']}]")
    report.append("")
    
    report.append("3. STUDENT RANKINGS")
    report.append("-" * 40)
    if rankings:
        for r in rankings[:10]:
            report.append(f"  #{r['rank']} {r['name']} — GPA: {r['gpa']}, Avg: {r['average_score']}%  [{r['trend']}]")
    report.append("")
    
    report.append("4. AT-RISK ALERTS")
    report.append("-" * 40)
    if at_risk:
        for s in at_risk:
            report.append(f"  ⚠ {s['name']} (Z-Score: {s['risk_score']}) — Requires immediate intervention")
    else:
        report.append("  ✓ No students currently at-risk")
    report.append("")
    
    report.append("5. RECOMMENDATIONS")
    report.append("-" * 40)
    report.append("  1. Implement differentiated instruction strategies")
    report.append("  2. Establish peer tutoring programs")
    report.append("  3. Increase parent-teacher communication for borderline students")
    report.append("  4. Create targeted study groups for weaker subjects")
    report.append("  5. Schedule regular performance review meetings")
    report.append("")
    report.append("=" * 60)
    report.append("    End of Report")
    report.append("=" * 60)
    
    return "\n".join(report)
