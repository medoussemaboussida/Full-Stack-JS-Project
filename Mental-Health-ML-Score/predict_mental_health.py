#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Mental Health Prediction Script

This script loads the trained mental health model and makes predictions
based on input data received from Node.js.
"""

import sys
import json
import os
import pandas as pd
import numpy as np
import joblib
from pathlib import Path

# Get the directory of the current script
SCRIPT_DIR = Path(__file__).parent.absolute()
MODEL_DIR = SCRIPT_DIR / "model"

# Paths to the saved model files
MODEL_PATH = MODEL_DIR / "mental_health_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "preprocessor.pkl"

def generate_recommendations(mental_health_risk, anxiety_score, stress_level, depression_score, favorite_activities=None):
    """
    Generate personalized recommendations based on mental health risk level.
    
    Args:
        mental_health_risk (str): Risk level ('High' or 'Low')
        anxiety_score (float): Anxiety score (0-5)
        stress_level (float): Stress level (0-5)
        depression_score (float): Depression score (0-5)
        favorite_activities (list, optional): List of user's favorite activities
        
    Returns:
        dict: Dictionary containing recommendations and risk level
    """
    # Calculate overall mental health score (0-15)
    mental_health_score = anxiety_score + stress_level + depression_score
    
    # Define default activities if none are provided
    default_activities = [
        "Méditation et pleine conscience",
        "Exercice physique régulier",
        "Yoga ou étirements",
        "Lecture",
        "Écouter de la musique",
        "Passer du temps dans la nature",
        "Tenir un journal",
        "Peinture ou dessin",
        "Rejoindre un club social",
        "Faire du bénévolat"
    ]
    
    activities = favorite_activities if favorite_activities else default_activities
    
    # Initialize recommendations
    recommendations = {
        "risk_level": mental_health_risk,
        "mental_health_score": mental_health_score,
        "professional_help": None,
        "activities": [],
        "daily_practices": []
    }
    
    # Generate recommendations based on risk level
    if mental_health_risk == 'High':
        if mental_health_score >= 10:
            # High risk with high score
            recommendations["professional_help"] = "Consulter un psychiatre dès que possible."
            recommendations["activities"] = activities[:3]  # Select first 3 activities
            recommendations["daily_practices"] = [
                "Pratiquer des exercices de respiration profonde plusieurs fois par jour",
                "Maintenir une routine de sommeil régulière",
                "Limiter la consommation de caféine et d'alcool",
                "Prendre des pauses régulières pendant les périodes de travail intense"
            ]
        else:
            # High risk with moderate score
            recommendations["professional_help"] = "Consulter un psychologue pour une évaluation."
            recommendations["activities"] = activities[:5]  # Select first 5 activities
            recommendations["daily_practices"] = [
                "Pratiquer la pleine conscience pendant 10 minutes chaque jour",
                "Faire de l'exercice physique modéré 3 fois par semaine",
                "Maintenir des contacts sociaux réguliers"
            ]
    else:  # Low risk
        if mental_health_score >= 6:
            # Low risk with moderate score
            recommendations["professional_help"] = "Envisager de consulter un conseiller en bien-être."
            recommendations["activities"] = activities[:7]  # Select first 7 activities
            recommendations["daily_practices"] = [
                "Pratiquer une activité relaxante chaque jour",
                "Maintenir un équilibre entre travail et loisirs"
            ]
        else:
            # Low risk with low score
            recommendations["professional_help"] = None
            recommendations["activities"] = activities
            recommendations["daily_practices"] = [
                "Continuer à maintenir un mode de vie équilibré",
                "Pratiquer des activités qui vous apportent de la joie régulièrement"
            ]
    
    return recommendations

def predict(input_data, favorite_activities=None):
    """
    Make a prediction using the trained model.
    
    Args:
        input_data (dict): Input data for prediction
        favorite_activities (list, optional): User's favorite activities
        
    Returns:
        dict: Prediction result with recommendations
    """
    try:
        # Load the model and preprocessor
        model = joblib.load(MODEL_PATH)
        
        # Convert input data to DataFrame
        df = pd.DataFrame([input_data])
        
        # Make prediction
        risk_level = model.predict(df)[0]
        
        # Generate recommendations
        recommendations = generate_recommendations(
            risk_level,
            input_data.get('Anxiety_Score', 0),
            input_data.get('Stress_Level', 0),
            input_data.get('Depression_Score', 0),
            favorite_activities
        )
        
        return recommendations
    except Exception as e:
        return {
            "error": str(e),
            "risk_level": "Unknown",
            "mental_health_score": 0,
            "professional_help": "Error occurred during prediction. Please try again.",
            "activities": [],
            "daily_practices": []
        }

if __name__ == "__main__":
    # Read input from stdin
    input_json = sys.stdin.read()
    
    try:
        # Parse input JSON
        data = json.loads(input_json)
        input_data = data.get('input_data', {})
        favorite_activities = data.get('favorite_activities', [])
        
        # Make prediction
        result = predict(input_data, favorite_activities)
        
        # Output result as JSON
        print(json.dumps(result))
    except Exception as e:
        # Handle errors
        error_result = {
            "error": str(e),
            "risk_level": "Unknown",
            "mental_health_score": 0,
            "professional_help": "Error occurred during prediction. Please try again.",
            "activities": [],
            "daily_practices": []
        }
        print(json.dumps(error_result))
