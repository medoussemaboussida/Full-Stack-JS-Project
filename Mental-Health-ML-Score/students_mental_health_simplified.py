# -*- coding: utf-8 -*-
"""
Mental Health Classifier with Recommendation System

This script builds a Decision Tree model to predict mental health risk levels
and provides personalized recommendations based on the predictions.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from imblearn.over_sampling import SMOTE
import os
import joblib
from imblearn.pipeline import Pipeline as ImbPipeline

# Vérifier l'existence du fichier
file_path = 'students_mental_health_survey.csv'
if not os.path.exists(file_path):
    raise FileNotFoundError(f"Le fichier {file_path} n'existe pas.")

# Charger le fichier CSV
print("Chargement des données...")
df = pd.read_csv(file_path)

# Afficher les informations de base
print(f"Dimensions du dataset: {df.shape}")
print(f"Nombre de valeurs manquantes: {df.isnull().sum().sum()}")

# Nettoyage des données
print("\nNettoyage des données...")

# Supprimer les doublons
df_size_before = df.shape[0]
df.drop_duplicates(inplace=True)
df_size_after = df.shape[0]
print(f"Suppression de {df_size_before - df_size_after} doublons")

# Imputer CGPA avec la médiane
if df['CGPA'].isnull().sum() > 0:
    df['CGPA'].fillna(df['CGPA'].median(), inplace=True)

# Imputer Substance_Use avec le mode
if df['Substance_Use'].isnull().sum() > 0:
    df['Substance_Use'].fillna(df['Substance_Use'].mode()[0], inplace=True)

# Supprimer les lignes avec des valeurs manquantes restantes
df = df.dropna()
print(f"Dimensions après nettoyage: {df.shape}")

# Standardiser les variables catégoriques (ex. supprimer espaces, convertir en minuscules)
categorical_cols = ['Course', 'Substance_Use', 'Counseling_Service_Use', 'Physical_Activity',
                    'Extracurricular_Involvement', 'Family_History', 'Chronic_Illness']
for col in categorical_cols:
    if df[col].dtype == 'object':
        df[col] = df[col].str.strip().str.lower()

# Définir Mental_Health_Risk (basé sur les scores)
df['Mental_Health_Risk'] = np.where(
    (df['Stress_Level'] >= 3) | (df['Depression_Score'] >= 3) | (df['Anxiety_Score'] >= 3),
    'High', 'Low'
)

print(f"Distribution de Mental_Health_Risk: {df['Mental_Health_Risk'].value_counts()}")

# Définir les caractéristiques et la cible
selected_features = [
    'Counseling_Service_Use', 'Stress_Level', 'Substance_Use', 'Age', 'Course',
    'Financial_Stress', 'Physical_Activity', 'Extracurricular_Involvement',
    'Semester_Credit_Load', 'Family_History', 'Chronic_Illness'
]
X = df[selected_features]
y = df['Mental_Health_Risk']

# Définir les colonnes catégoriques et numériques
categorical_cols = [
    'Counseling_Service_Use', 'Substance_Use', 'Course', 'Physical_Activity',
    'Extracurricular_Involvement', 'Family_History', 'Chronic_Illness'
]
numerical_cols = ['Stress_Level', 'Age', 'Financial_Stress', 'Semester_Credit_Load']

# Créer un préprocesseur
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), numerical_cols),
        ('cat', OneHotEncoder(drop='first', sparse_output=False, handle_unknown='ignore'), categorical_cols)
    ])

# Séparer les données
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"Dimensions X_train, X_test: {X_train.shape}, {X_test.shape}")

# Créer un pipeline avec SMOTE pour l'Arbre de Décision
print("\nEntraînement du modèle Arbre de Décision...")
dt_pipeline = ImbPipeline(steps=[
    ('preprocessor', preprocessor),
    ('smote', SMOTE(random_state=42)),
    ('classifier', DecisionTreeClassifier(random_state=42))
])

# Optimiser les hyperparamètres
param_grid = {
    'classifier__max_depth': [3, 5, 7, None],
    'classifier__min_samples_split': [2, 5, 10]
}
grid_search_dt = GridSearchCV(dt_pipeline, param_grid, cv=5, scoring='f1_weighted', n_jobs=-1)
grid_search_dt.fit(X_train, y_train)

# Meilleur modèle
best_dt = grid_search_dt.best_estimator_
y_pred_dt = best_dt.predict(X_test)

# Évaluation
accuracy_dt = accuracy_score(y_test, y_pred_dt)
f1_dt = f1_score(y_test, y_pred_dt, average='weighted')
report_dt = classification_report(y_test, y_pred_dt, zero_division=0)

# Afficher les résultats
print('\nRésultats du modèle Arbre de Décision:')
print(f'Précision: {accuracy_dt:.4f}')
print(f'F1-Score: {f1_dt:.4f}')
print(f'Meilleurs hyperparamètres: {grid_search_dt.best_params_}')
print('Rapport de classification:')
print(report_dt)

# Créer une fonction pour générer des recommandations basées sur le niveau de risque mental
def generate_recommendations(mental_health_risk, anxiety_score, stress_level, depression_score, favorite_activities=None):
    """
    Génère des recommandations personnalisées basées sur le niveau de risque mental.

    Args:
        mental_health_risk (str): Niveau de risque ('High' ou 'Low')
        anxiety_score (float): Score d'anxiété (0-5)
        stress_level (float): Niveau de stress (0-5)
        depression_score (float): Score de dépression (0-5)
        favorite_activities (list, optional): Liste des activités préférées de l'utilisateur

    Returns:
        dict: Dictionnaire contenant les recommandations et le niveau de risque
    """
    # Calculer le score mental global (0-15)
    mental_health_score = anxiety_score + stress_level + depression_score

    # Définir les activités par défaut si aucune n'est fournie
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

    # Initialiser les recommandations
    recommendations = {
        "risk_level": mental_health_risk,
        "mental_health_score": mental_health_score,
        "professional_help": None,
        "activities": [],
        "daily_practices": []
    }

    # Recommandations basées sur le niveau de risque
    if mental_health_risk == 'High':
        if mental_health_score >= 10:
            # Risque élevé avec score élevé
            recommendations["professional_help"] = "Consulter un psychiatre dès que possible."
            recommendations["activities"] = activities[:3]  # Sélectionner les 3 premières activités
            recommendations["daily_practices"] = [
                "Pratiquer des exercices de respiration profonde plusieurs fois par jour",
                "Maintenir une routine de sommeil régulière",
                "Limiter la consommation de caféine et d'alcool",
                "Prendre des pauses régulières pendant les périodes de travail intense"
            ]
        else:
            # Risque élevé avec score modéré
            recommendations["professional_help"] = "Consulter un psychologue pour une évaluation."
            recommendations["activities"] = activities[:5]  # Sélectionner les 5 premières activités
            recommendations["daily_practices"] = [
                "Pratiquer la pleine conscience pendant 10 minutes chaque jour",
                "Faire de l'exercice physique modéré 3 fois par semaine",
                "Maintenir des contacts sociaux réguliers"
            ]
    else:  # Risque faible
        if mental_health_score >= 6:
            # Risque faible avec score modéré
            recommendations["professional_help"] = "Envisager de consulter un conseiller en bien-être."
            recommendations["activities"] = activities[:7]  # Sélectionner les 7 premières activités
            recommendations["daily_practices"] = [
                "Pratiquer une activité relaxante chaque jour",
                "Maintenir un équilibre entre travail et loisirs"
            ]
        else:
            # Risque faible avec score faible
            recommendations["professional_help"] = None
            recommendations["activities"] = activities
            recommendations["daily_practices"] = [
                "Continuer à maintenir un mode de vie équilibré",
                "Pratiquer des activités qui vous apportent de la joie régulièrement"
            ]

    return recommendations

# Créer une classe pour encapsuler le modèle et les fonctionnalités de recommandation
class MentalHealthRecommender:
    def __init__(self, model, preprocessor):
        self.model = model
        self.preprocessor = preprocessor
        self.selected_features = selected_features  # Stocker les caractéristiques sélectionnées

    def predict_risk(self, user_data):
        """
        Prédit le niveau de risque mental à partir des données utilisateur.

        Args:
            user_data (dict): Données utilisateur contenant les caractéristiques nécessaires

        Returns:
            str: Niveau de risque prédit ('High' ou 'Low')
        """
        # Convertir les données utilisateur en DataFrame
        user_df = pd.DataFrame([user_data])

        # S'assurer que toutes les caractéristiques nécessaires sont présentes
        for feature in self.selected_features:
            if feature not in user_df.columns:
                raise ValueError(f"La caractéristique '{feature}' est manquante dans les données utilisateur")

        # Prédire le niveau de risque en utilisant directement le pipeline
        # Si nous utilisons un pipeline complet
        if hasattr(self.model, 'predict'):
            X_user = user_df[self.selected_features]
            risk_level = self.model.predict(X_user)[0]
        # Si nous utilisons un préprocesseur séparé et un modèle
        else:
            X_user = user_df[self.selected_features]
            X_user_processed = self.preprocessor.transform(X_user)
            risk_level = self.model.named_steps['classifier'].predict(X_user_processed)[0]

        return risk_level

    def get_recommendations(self, user_data, favorite_activities=None):
        """
        Génère des recommandations personnalisées basées sur les données utilisateur.

        Args:
            user_data (dict): Données utilisateur contenant les caractéristiques nécessaires
            favorite_activities (list, optional): Liste des activités préférées de l'utilisateur

        Returns:
            dict: Recommandations personnalisées
        """
        # Prédire le niveau de risque
        risk_level = self.predict_risk(user_data)

        # Générer des recommandations
        recommendations = generate_recommendations(
            risk_level,
            user_data.get('Anxiety_Score', 0),
            user_data.get('Stress_Level', 0),
            user_data.get('Depression_Score', 0),
            favorite_activities
        )

        return recommendations

# Créer une instance du recommandeur avec le préprocesseur déjà ajusté
# Nous utilisons le préprocesseur du pipeline qui a déjà été ajusté pendant l'entraînement
fitted_preprocessor = best_dt.named_steps['preprocessor']
recommender = MentalHealthRecommender(best_dt, fitted_preprocessor)

# Exemple d'utilisation
example_user = {
    'Counseling_Service_Use': 'never',
    'Stress_Level': 4,
    'Substance_Use': 'never',
    'Age': 22,
    'Course': 'computer science',
    'Financial_Stress': 3,
    'Physical_Activity': 'low',
    'Extracurricular_Involvement': 'low',
    'Semester_Credit_Load': 18,
    'Family_History': 'no',
    'Chronic_Illness': 'no',
    'Anxiety_Score': 3,
    'Depression_Score': 2
}

example_activities = [
    "Jogging",
    "Natation",
    "Méditation",
    "Jeux vidéo",
    "Cuisine",
    "Photographie",
    "Randonnée",
    "Cinéma"
]

# Obtenir des recommandations pour l'exemple d'utilisateur
print("\nTest du système de recommandation avec un exemple d'utilisateur...")
example_recommendations = recommender.get_recommendations(example_user, example_activities)

# Afficher les recommandations
print("\nExemple de recommandations:")
print(f"Niveau de risque: {example_recommendations['risk_level']}")
print(f"Score de santé mentale: {example_recommendations['mental_health_score']}")
if example_recommendations['professional_help']:
    print(f"Aide professionnelle recommandée: {example_recommendations['professional_help']}")
print("\nActivités recommandées:")
for activity in example_recommendations['activities']:
    print(f"- {activity}")
print("\nPratiques quotidiennes recommandées:")
for practice in example_recommendations['daily_practices']:
    print(f"- {practice}")

# Sauvegarder le modèle et le préprocesseur
print("\nSauvegarde du modèle et du préprocesseur...")
model_dir = 'model'
os.makedirs(model_dir, exist_ok=True)

# Sauvegarder le modèle
joblib.dump(best_dt, os.path.join(model_dir, 'mental_health_model.pkl'))
# Sauvegarder le préprocesseur
joblib.dump(preprocessor, os.path.join(model_dir, 'preprocessor.pkl'))
# Sauvegarder le recommandeur
joblib.dump(recommender, os.path.join(model_dir, 'recommender.pkl'))

print(f"Modèle sauvegardé dans le dossier '{model_dir}'")
print("Terminé!")
