# -*- coding: utf-8 -*-
"""
visualizations.py

Purpose:
    Generates medical diagnostic visualizations using Matplotlib.
    Outputs:
        1. A Pie Chart displaying Top-3 disease prediction probabilities.
        2. A Bar Chart comparing prediction confidence scores.
    Configures Matplotlib to run in headless 'Agg' mode to prevent container crashes.
"""

import os
# Force non-interactive backend for headless execution (essential for server containers)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def generate_prediction_charts(predictions, output_dir='static/charts'):
    """
    Renders and saves professional diagnostic charts based on model prediction rates.
    Saves:
        - probability_pie.png: Pie Chart of Top predictions.
        - confidence_bar.png: Bar Chart of Top predictions.
    """
    if not predictions:
        print("No predictions supplied. Skipping chart generation.")
        return False

    os.makedirs(output_dir, exist_ok=True)

    diseases = [p['disease'] for p in predictions]
    confidences = [p['confidence'] for p in predictions]
    
    # Complete remaining probability up to 100% for the pie chart
    sum_conf = sum(confidences)
    if sum_conf < 100:
        diseases.append("Others")
        confidences.append(round(100.0 - sum_conf, 2))

    # Define premium colors fitting our clinical theme (emerald, teal, gray, etc.)
    colors = ['#10b981', '#06b6d4', '#3b82f6', '#94a3b8']

    # --- 1. RENDER PIE CHART ---
    try:
        plt.figure(figsize=(6, 5))
        plt.pie(
            confidences, 
            labels=diseases, 
            autopct='%1.1f%%', 
            startangle=140, 
            colors=colors[:len(diseases)],
            textprops={'fontsize': 10, 'weight': 'bold', 'color': '#1e293b'}
        )
        plt.title("Disease Probability Allocation", fontsize=12, fontweight='bold', pad=15, color='#0f172a')
        plt.tight_layout()
        pie_path = os.path.join(output_dir, 'probability_pie.png')
        plt.savefig(pie_path, dpi=150, bbox_inches='tight', transparent=True)
        plt.close()
    except Exception as e:
        print(f"Error rendering probability pie chart: {e}")

    # --- 2. RENDER BAR CHART ---
    try:
        # Restore only predictions for bar chart comparing specific matched scores
        chart_diseases = [p['disease'] for p in predictions]
        chart_confidences = [p['confidence'] for p in predictions]

        plt.figure(figsize=(7, 4))
        bars = plt.barh(
            chart_diseases[::-1], 
            chart_confidences[::-1], 
            color=['#3b82f6', '#06b6d4', '#10b981'][:len(chart_diseases)][::-1],
            height=0.5
        )
        
        # Add values inside/beside bars
        for bar in bars:
            width = bar.get_width()
            plt.text(
                width + 1, 
                bar.get_y() + bar.get_height()/2, 
                f"{width:.1f}%", 
                ha='left', 
                va='center', 
                fontsize=9, 
                fontweight='bold', 
                color='#334155'
            )

        plt.xlim(0, 110)
        plt.xlabel("Confidence Score (%)", fontsize=10, fontweight='bold', labelpad=10, color='#1e293b')
        plt.title("Confidence Comparison of Top Matches", fontsize=12, fontweight='bold', pad=15, color='#0f172a')
        
        # Style grid & spines
        plt.gca().spines['top'].set_visible(False)
        plt.gca().spines['right'].set_visible(False)
        plt.gca().spines['left'].set_color('#cbd5e1')
        plt.gca().spines['bottom'].set_color('#cbd5e1')
        
        plt.tight_layout()
        bar_path = os.path.join(output_dir, 'confidence_bar.png')
        plt.savefig(bar_path, dpi=150, bbox_inches='tight', transparent=True)
        plt.close()
        return True
    except Exception as e:
        print(f"Error rendering confidence bar chart: {e}")
        return False

if __name__ == "__main__":
    # Test chart creation
    test_data = [
        {"disease": "Fungal infection", "confidence": 75.0},
        {"disease": "Drug Reaction", "confidence": 15.5},
        {"disease": "Allergy", "confidence": 9.5}
    ]
    generate_prediction_charts(test_data, "static/charts")
