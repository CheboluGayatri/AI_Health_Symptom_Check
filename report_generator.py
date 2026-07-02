# -*- coding: utf-8 -*-
"""
report_generator.py

Purpose:
    Generates a high-quality, professional clinical PDF report using ReportLab.
    Includes:
        - Hospital/Clinic styling and patient demographic metadata header.
        - Detailed listing of symptoms checked.
        - Primary and differential disease predictions with confidence ratings.
        - Embedded matplotlib probability distribution charts.
        - Actionable medical recommendations, general medication guides, and precautions.
        - Standard bold legal disclaimer in the footer.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image

def generate_pdf_report(patient_name, symptoms, predictions, recommendations, charts_dir='static/charts', output_path='reports/diagnostic_report.pdf'):
    """
    Assembles and writes a clinical diagnostic PDF file.
    Returns the absolute path to the generated PDF.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Establish document layout geometry
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # --- DEFINE CUSTOM CLINICAL THEME COLORS ---
    PRIMARY_COLOR = colors.HexColor("#10b981")  # Clean Emerald
    SECONDARY_COLOR = colors.HexColor("#0f172a") # Slate Navy
    TEXT_COLOR = colors.HexColor("#334155")     # Charcoal Gray
    LIGHT_BG = colors.HexColor("#f8fafc")       # Soft Off-White

    # --- CUSTOM STYLES ---
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=PRIMARY_COLOR,
        spaceAfter=5
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=SECONDARY_COLOR,
        spaceAfter=10,
        spaceBefore=15
    )

    body_text = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=TEXT_COLOR,
        leading=14
    )

    bold_body = ParagraphStyle(
        'BoldBodyText',
        parent=body_text,
        fontName='Helvetica-Bold'
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor("#94a3b8"),
        leading=12,
        alignment=1  # Centered
    )

    # --- 1. HEADER SECTION ---
    story.append(Paragraph("AI HEALTH SYMPTOM CHECKER", title_style))
    story.append(Paragraph("Automated Pre-Clinical Diagnostic Assessment Report", subtitle_style))
    story.append(Spacer(1, 10))

    # --- 2. PATIENT INFO BLOCK (TABLE) ---
    current_time = datetime.now().strftime("%B %d, %Y - %I:%M %p")
    info_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_text), Paragraph(patient_name, bold_body),
            Paragraph("<b>Assessment Date:</b>", body_text), Paragraph(current_time, body_text)
        ],
        [
            Paragraph("<b>Source System:</b>", body_text), Paragraph("Machine Learning Engine", body_text),
            Paragraph("<b>Report Status:</b>", body_text), Paragraph("<b>PRE-CLINICAL STUDY</b>", bold_body)
        ]
    ]
    
    info_table = Table(info_data, colWidths=[100, 160, 110, 160])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, -1), (-1, -1), 1, colors.HexColor("#cbd5e1")),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # --- 3. SYMPTOMS SUBMITTED ---
    story.append(Paragraph("I. Symptoms Evaluated", section_heading))
    symptoms_list_str = ", ".join([s.strip().replace('_', ' ').title() for s in symptoms])
    story.append(Paragraph(f"The following user-reported symptom traits were mapped onto the ML feature index: <font color='#10b981'><b>{symptoms_list_str}</b></font>", body_text))
    story.append(Spacer(1, 15))

    # --- 4. PREDICTIONS AND MODEL MATCHES ---
    story.append(Paragraph("II. Machine Learning Diagnosis Results", section_heading))
    
    # Differential Diagnosis Table
    pred_data = [["Rank", "Predicted Condition / Disease", "Confidence Interval (%)"]]
    for idx, p in enumerate(predictions):
        pred_data.append([
            str(idx + 1),
            p['disease'],
            f"{p['confidence']:.2f}%"
        ])

    pred_table = Table(pred_data, colWidths=[50, 330, 150])
    pred_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(pred_table)
    story.append(Spacer(1, 15))

    # --- 5. EMBED DIAGNOSTIC CHARTS ---
    pie_img_path = os.path.join(charts_dir, 'probability_pie.png')
    bar_img_path = os.path.join(charts_dir, 'confidence_bar.png')
    
    chart_elements = []
    # If the pre-generated charts exist, load and side-by-side or stack them
    if os.path.exists(pie_img_path):
        try:
            chart_elements.append(Image(pie_img_path, width=220, height=180))
        except Exception as e:
            print(f"Error packing pie image into PDF: {e}")
    if os.path.exists(bar_img_path):
        try:
            chart_elements.append(Image(bar_img_path, width=280, height=160))
        except Exception as e:
            print(f"Error packing bar image into PDF: {e}")

    if chart_elements:
        story.append(Paragraph("III. Visual Diagnostic Analytics", section_heading))
        # Embed side-by-side table
        charts_table = Table([chart_elements], colWidths=[260, 270])
        charts_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(charts_table)
        story.append(Spacer(1, 15))

    # --- 6. ACTIONABLE CLINICAL RECOMMENDATIONS ---
    story.append(Paragraph("IV. Recommended Support & Precautions", section_heading))
    
    # Safely unpacking recommendations dictionary
    precautions_list = recommendations.get('precautions', ["Rest fully", "Stay hydrated"])
    medicines_list = recommendations.get('medicines', ["Supportive symptom relievers only"])
    general_advice = recommendations.get('advice', "Consult a doctor for complete diagnosis.")
    health_tips = recommendations.get('tips', "Maintain balanced nutrition and sleep cycles.")

    recs_text = f"""
    <b>General Safety Precautions:</b><br/>
    {chr(10).join([f"• {p}<br/>" for p in precautions_list])}<br/>
    <b>Suggested Supportive Care:</b><br/>
    {chr(10).join([f"• {m}<br/>" for m in medicines_list])}<br/>
    <b>General Health Tip:</b> {health_tips}<br/><br/>
    <b>Physician Consultation Advisory:</b> {general_advice}
    """
    
    story.append(Paragraph(recs_text, body_text))
    story.append(Spacer(1, 20))

    # --- 7. MEDICAL DISCLAIMER & FOOTER ---
    story.append(Paragraph(
        "<b>CLINICAL DISCLAIMER:</b> The AI Health Symptom Checker assessment represents a computational probability mapping based on historic research datasets. "
        "It does not constitute real clinical diagnostic assessments, medical prescription advice, or surgery recommendations. "
        "Always review treatment regimens directly with certified clinical practitioners prior to medication administration.",
        disclaimer_style
    ))

    # Build the document flowable story
    doc.build(story)
    return os.path.abspath(output_path)

if __name__ == "__main__":
    # Standalone diagnostic print test
    test_recommendations = {
        "precautions": ["Wash hands regularly", "Avoid close contact with others"],
        "medicines": ["Topical Antifungal Cream", "Oral Antihistamines"],
        "advice": "Review conditions with your general physician.",
        "tips": "Sleep on high cotton fabrics and maintain low ambient humidity."
    }
    test_predictions = [{"disease": "Fungal infection", "confidence": 92.5}]
    generate_pdf_report(
        "John Doe",
        ["itching", "skin_rash"],
        test_predictions,
        test_recommendations,
        charts_dir='static/charts',
        output_path='reports/test_report.pdf'
    )
    print("Test PDF Report built successfully at reports/test_report.pdf")
