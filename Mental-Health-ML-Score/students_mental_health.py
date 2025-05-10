# -*- coding: utf-8 -*-
"""students_mental_health_survey (5).ipynb

Modified version with recommendation system and model saving capabilities.
Simplified version with only Decision Tree model and no plots.

### Partie 1: Importation
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, classification_report, f1_score
from imblearn.over_sampling import SMOTE
from tabulate import tabulate
import os
import joblib
from imblearn.pipeline import Pipeline as ImbPipeline

# Vérifier l'existence du fichier
file_path = 'students_mental_health_survey.csv'
if not os.path.exists(file_path):
    raise FileNotFoundError(f"Le fichier {file_path} n'existe pas.")

# Charger le fichier CSV
df = pd.read_csv(file_path)

# Afficher les colonnes
print('Colonnes du dataset :', df.columns.tolist())

# Afficher les 5 premières lignes
print('\n5 premières lignes :')
print(tabulate(df.head(), headers='keys', tablefmt='pretty'))

# Statistiques descriptives
print('\nStatistiques descriptives :')
print(df.describe())

# Informations sur les données
print('\nInformations sur les données :')
df.info()

# Pourcentage de valeurs manquantes
print('\nPourcentage de valeurs manquantes par colonne :')
print((df.isnull().sum() / len(df) * 100).round(2))

"""### Partie 2: Nettoyage de données"""

# Supprimer les doublons
print('\nNombre de doublons :', df.duplicated().sum())
df.drop_duplicates(inplace=True)
print('Nombre de doublons après suppression :', df.duplicated().sum())

# Vérifier les valeurs manquantes
print('\nValeurs manquantes par colonne :\n', df.isnull().sum())

# Imputer CGPA avec la médiane
if df['CGPA'].isnull().sum() > 0:
    df['CGPA'].fillna(df['CGPA'].median(), inplace=True)

# Imputer Substance_Use avec le mode
if df['Substance_Use'].isnull().sum() > 0:
    df['Substance_Use'].fillna(df['Substance_Use'].mode()[0], inplace=True)

# Explorer les colonnes avec valeurs manquantes restantes
print('\nColonnes avec valeurs manquantes restantes :\n', df.isnull().sum())
# Supprimer les lignes avec des valeurs manquantes uniquement si nécessaire
df = df.dropna()

# Standardiser les variables catégoriques (ex. supprimer espaces, convertir en minuscules)
categorical_cols = ['Course', 'Substance_Use', 'Counseling_Service_Use', 'Physical_Activity',
                    'Extracurricular_Involvement', 'Family_History', 'Chronic_Illness']
for col in categorical_cols:
    if df[col].dtype == 'object':
        df[col] = df[col].str.strip().str.lower()

# Vérifier les valeurs uniques pour détecter les incohérences
print('\nValeurs uniques par colonne :')
for col in categorical_cols:
    print(f'{col} : {df[col].unique()}\n')

# Vérifier les valeurs manquantes après traitement
print('Valeurs manquantes après traitement :\n', df.isnull().sum())

"""#### Visualisation de données"""

# Matrice de corrélation
plt.figure(figsize=(10, 8))
numerical_cols = ['Stress_Level', 'Depression_Score', 'Anxiety_Score', 'CGPA', 'Semester_Credit_Load', 'Age']
sns.heatmap(df[numerical_cols].corr(), annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Matrice de corrélation des variables numériques')
plt.show()

# Histogrammes
df[numerical_cols].hist(figsize=(20, 15), bins=20)
plt.suptitle('Distribution des variables numériques', fontsize=16)
plt.tight_layout()
plt.show()

# Distribution des scores de stress, anxiété et dépression
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
sns.histplot(df['Stress_Level'], bins=6, kde=True, ax=axes[0], color='blue')
axes[0].set_title('Distribution du Niveau de Stress (0-5)')
sns.histplot(df['Depression_Score'], bins=6, kde=True, ax=axes[1], color='red')
axes[1].set_title('Distribution du Score de Dépression (0-5)')
sns.histplot(df['Anxiety_Score'], bins=6, kde=True, ax=axes[2], color='green')
axes[2].set_title('Distribution du Score d\'Anxiété (0-5)')
plt.tight_layout()
plt.show()

# Corrélation entre Soutien Social et Dépression
plt.figure(figsize=(8, 6))
sns.boxplot(x=df['Social_Support'], y=df['Depression_Score'])
plt.title('Score de Dépression par Niveau de Soutien Social')
plt.xlabel('Soutien Social (Low, Moderate, High)')
plt.ylabel('Score de Dépression (0-5)')
plt.show()

# Test statistique pour la corrélation
from scipy.stats import pearsonr
corr, p_value = pearsonr(df['Stress_Level'], df['Depression_Score'])
print(f'Corrélation entre Stress_Level et Depression_Score : {corr:.4f}, p-value : {p_value:.4f}')

"""### Partie 3: Transformation de données

#### Séparation des Données et Préparation
"""

# Définir Mental_Health_Risk (exemple : basé sur les scores)
df['Mental_Health_Risk'] = np.where(
    (df['Stress_Level'] >= 3) | (df['Depression_Score'] >= 3) | (df['Anxiety_Score'] >= 3),
    'High', 'Low'
)

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
print('\nDimensions X_train, X_test :', X_train.shape, X_test.shape)

# Créer un pipeline avec SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
pipeline = ImbPipeline(steps=[
    ('preprocessor', preprocessor),
    ('smote', SMOTE(random_state=42))
])

# Appliquer le preprocessing et SMOTE
X_train_resampled, y_train_resampled = pipeline.named_steps['smote'].fit_resample(
    pipeline.named_steps['preprocessor'].fit_transform(X_train), y_train
)

# Vérifier la distribution des classes après SMOTE
print('\nDistribution des classes après SMOTE :')
print(pd.Series(y_train_resampled).value_counts(normalize=True))

# Impact de l'Activité Physique sur le Stress
plt.figure(figsize=(8, 6))
sns.boxplot(x=df['Physical_Activity'], y=df['Stress_Level'])
plt.title('Influence de l\'Activité Physique sur le Stress')
plt.show()

# Visualisation de l'impact du genre
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
sns.boxplot(x='Gender', y='Stress_Level', data=df, ax=axes[0], palette='Blues')
axes[0].set_title('Niveau de Stress par Genre')
sns.boxplot(x='Gender', y='Depression_Score', data=df, ax=axes[1], palette='Reds')
axes[1].set_title('Score de Dépression par Genre')
sns.boxplot(x='Gender', y='Anxiety_Score', data=df, ax=axes[2], palette='Greens')
axes[2].set_title('Score d\'Anxiété par Genre')
plt.tight_layout()
plt.show()

# Impact du type de résidence sur le stress
plt.figure(figsize=(10, 6))
sns.boxplot(x='Residence_Type', y='Stress_Level', data=df, palette='coolwarm')
plt.title('Niveau de Stress en Fonction du Type de Résidence')
plt.xticks(rotation=45)
plt.show()

# Vérifier la distribution de Mental_Health_Risk
print('\nDistribution de Mental_Health_Risk :')
print(df['Mental_Health_Risk'].value_counts(normalize=True))

"""## Partie 4: Modélisation

### 1. Modèle KNN (K-Nearest Neighbors Classifier)
"""

# Créer un pipeline pour KNN
knn_pipeline = ImbPipeline(steps=[
    ('preprocessor', preprocessor),
    ('smote', SMOTE(random_state=42)),
    ('classifier', KNeighborsClassifier())
])

# Optimiser les hyperparamètres
param_grid = {
    'classifier__n_neighbors': range(3, 21, 2),
    'classifier__metric': ['euclidean', 'manhattan']
}
grid_search = GridSearchCV(knn_pipeline, param_grid, cv=5, scoring='f1_weighted', n_jobs=-1)
grid_search.fit(X_train, y_train)

# Meilleur modèle
best_knn = grid_search.best_estimator_
y_pred_knn = best_knn.predict(X_test)

# Évaluation
accuracy_knn = accuracy_score(y_test, y_pred_knn)
f1_knn = f1_score(y_test, y_pred_knn, average='weighted')
roc_auc_knn = roc_auc_score(pd.get_dummies(y_test), pd.get_dummies(y_pred_knn), multi_class='ovr')
report_knn = classification_report(y_test, y_pred_knn, zero_division=0)

# Afficher les résultats
print('\n🔍 Résultats du modèle KNN Classifier (optimisé) :')
print(f'Précision : {accuracy_knn:.4f}')
print(f'F1-Score : {f1_knn:.4f}')
print(f'AUC-ROC : {roc_auc_knn:.4f}')
print(f'Meilleurs hyperparamètres : {grid_search.best_params_}')
print('Rapport :\n', report_knn)

# Matrice de confusion
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, y_pred_knn), annot=True, fmt='d', cmap='Blues')
plt.title('KNN Classifier Confusion Matrix')
plt.xlabel('Prédit')
plt.ylabel('Réel')
plt.show()

"""### 2. Modèle SVM (Support Vector Machine Classifier)"""

# Créer un pipeline pour SVM
svm_pipeline = ImbPipeline(steps=[
    ('preprocessor', preprocessor),
    ('smote', SMOTE(random_state=42)),
    ('classifier', SVC(probability=True, random_state=42))
])

# Optimiser les hyperparamètres
param_grid = {
    'classifier__C': [0.1, 1, 10],
    'classifier__kernel': ['linear', 'rbf']
}
grid_search_svm = GridSearchCV(svm_pipeline, param_grid, cv=5, scoring='f1_weighted', n_jobs=-1)
grid_search_svm.fit(X_train, y_train)

# Meilleur modèle
best_svm = grid_search_svm.best_estimator_
y_pred_svm = best_svm.predict(X_test)

# Évaluation
accuracy_svm = accuracy_score(y_test, y_pred_svm)
f1_svm = f1_score(y_test, y_pred_svm, average='weighted')
roc_auc_svm = roc_auc_score(pd.get_dummies(y_test), pd.get_dummies(y_pred_svm), multi_class='ovr')
report_svm = classification_report(y_test, y_pred_svm, zero_division=0)

# Afficher les résultats
print('\n🔍 Résultats SVM Classifier :')
print(f'Précision : {accuracy_svm:.4f}')
print(f'F1-Score : {f1_svm:.4f}')
print(f'AUC-ROC : {roc_auc_svm:.4f}')
print(f'Meilleurs hyperparamètres : {grid_search_svm.best_params_}')
print('Rapport :\n', report_svm)

# Matrice de confusion
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, y_pred_svm), annot=True, fmt='d', cmap='Greens')
plt.title('SVM Classifier Confusion Matrix')
plt.xlabel('Prédit')
plt.ylabel('Réel')
plt.show()

"""### 3. Modèle Arbre de Décision (Decision Tree Classifier)"""

# Créer un pipeline pour Decision Tree
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
roc_auc_dt = roc_auc_score(pd.get_dummies(y_test), pd.get_dummies(y_pred_dt), multi_class='ovr')
report_dt = classification_report(y_test, y_pred_dt, zero_division=0)

# Afficher les résultats
print('\n🔍 Résultats Arbre de Décision Classifier :')
print(f'Précision : {accuracy_dt:.4f}')
print(f'F1-Score : {f1_dt:.4f}')
print(f'AUC-ROC : {roc_auc_dt:.4f}')
print(f'Meilleurs hyperparamètres : {grid_search_dt.best_params_}')
print('Rapport :\n', report_dt)

# Matrice de confusion
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, y_pred_dt), annot=True, fmt='d', cmap='Reds')
plt.title('Decision Tree Classifier Confusion Matrix')
plt.xlabel('Prédit')
plt.ylabel('Réel')
plt.show()

"""### Comparaison des modèles"""

# Création d’un tableau récapitulatif
performance_summary = pd.DataFrame({
    'Modèle': ['KNN Classifier', 'SVM Classifier', 'Arbre de Décision Classifier'],
    'Précision': [accuracy_knn, accuracy_svm, accuracy_dt],
    'F1-Score': [f1_knn, f1_svm, f1_dt],
    'AUC-ROC': [roc_auc_knn, roc_auc_svm, roc_auc_dt]
})

# Afficher le tableau
print('\n🔍 Comparaison des performances des trois modèles :')
print(tabulate(performance_summary, headers='keys', tablefmt='pretty'))

# Visualisation : Graphique en barres pour les métriques
fig, axes = plt.subplots(1, 3, figsize=(18, 6))
sns.barplot(x='Modèle', y='Précision', data=performance_summary, palette='viridis', ax=axes[0])
axes[0].set_title('Comparaison des précisions')
axes[0].set_ylim(0, 1)
for i, v in enumerate(performance_summary['Précision']):
    axes[0].text(i, v + 0.02, f'{v:.4f}', ha='center')

sns.barplot(x='Modèle', y='F1-Score', data=performance_summary, palette='viridis', ax=axes[1])
axes[1].set_title('Comparaison des F1-Scores')
axes[1].set_ylim(0, 1)
for i, v in enumerate(performance_summary['F1-Score']):
    axes[1].text(i, v + 0.02, f'{v:.4f}', ha='center')

sns.barplot(x='Modèle', y='AUC-ROC', data=performance_summary, palette='viridis', ax=axes[2])
axes[2].set_title('Comparaison des AUC-ROC')
axes[2].set_ylim(0, 1)
for i, v in enumerate(performance_summary['AUC-ROC']):
    axes[2].text(i, v + 0.02, f'{v:.4f}', ha='center')

plt.tight_layout()
plt.show()

"""#### Clustering"""

# Sélection des variables pour le clustering
X_clustering = df[['Stress_Level', 'Anxiety_Score', 'Depression_Score', 'Sleep_Quality', 'Social_Support']]

# Encoder les variables catégoriques
X_clustering = pd.get_dummies(X_clustering, columns=['Sleep_Quality', 'Social_Support'], drop_first=True)

# Normaliser les données
scaler = StandardScaler()
X_clustering_scaled = scaler.fit_transform(X_clustering)

# Méthode du coude pour déterminer le nombre de clusters
inertias = []
for k in range(1, 11):
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    kmeans.fit(X_clustering_scaled)
    inertias.append(kmeans.inertia_)

plt.figure(figsize=(8, 6))
plt.plot(range(1, 11), inertias, marker='o')
plt.title('Méthode du coude pour K-Means')
plt.xlabel('Nombre de clusters')
plt.ylabel('Inertie')
plt.show()

# Appliquer K-Means avec le nombre optimal de clusters (ex. 3)
kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
df['Cluster'] = kmeans.fit_predict(X_clustering_scaled)

# Calculer le Silhouette Score
silhouette_avg = silhouette_score(X_clustering_scaled, df['Cluster'])
print('Score de silhouette pour k=3 :', silhouette_avg)

# Visualiser les clusters
plt.figure(figsize=(8, 6))
sns.scatterplot(x=df['Stress_Level'], y=df['Anxiety_Score'], hue=df['Cluster'], palette='coolwarm')
plt.title('Segmentation des étudiants par Stress et Anxiété (K-Means, k=3)')
plt.xlabel('Niveau de Stress (0-5)')
plt.ylabel('Score d\'Anxiété (0-5)')
plt.show()

"""### Partie 5: Création d'un modèle de recommandation et sauvegarde"""

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

# Créer un modèle RandomForest pour la prédiction du risque mental
print("\n🔍 Création d'un modèle RandomForest pour la prédiction du risque mental...")

# Créer un pipeline avec RandomForest
rf_pipeline = ImbPipeline(steps=[
    ('preprocessor', preprocessor),
    ('smote', SMOTE(random_state=42)),
    ('classifier', RandomForestClassifier(n_estimators=200, random_state=42))
])

# Optimiser les hyperparamètres
param_grid = {
    'classifier__max_depth': [10, 20, None],
    'classifier__min_samples_split': [2, 5, 10]
}
grid_search_rf = GridSearchCV(rf_pipeline, param_grid, cv=5, scoring='f1_weighted', n_jobs=-1)
grid_search_rf.fit(X_train, y_train)

# Meilleur modèle
best_rf = grid_search_rf.best_estimator_
y_pred_rf = best_rf.predict(X_test)

# Évaluation
accuracy_rf = accuracy_score(y_test, y_pred_rf)
f1_rf = f1_score(y_test, y_pred_rf, average='weighted')
roc_auc_rf = roc_auc_score(pd.get_dummies(y_test), pd.get_dummies(y_pred_rf), multi_class='ovr')
report_rf = classification_report(y_test, y_pred_rf, zero_division=0)

# Afficher les résultats
print('\n🔍 Résultats du modèle RandomForest Classifier (optimisé) :')
print(f'Précision : {accuracy_rf:.4f}')
print(f'F1-Score : {f1_rf:.4f}')
print(f'AUC-ROC : {roc_auc_rf:.4f}')
print(f'Meilleurs hyperparamètres : {grid_search_rf.best_params_}')
print('Rapport :\n', report_rf)

# Matrice de confusion
plt.figure(figsize=(8, 6))
sns.heatmap(confusion_matrix(y_test, y_pred_rf), annot=True, fmt='d', cmap='Blues')
plt.title('RandomForest Classifier Confusion Matrix')
plt.xlabel('Prédit')
plt.ylabel('Réel')
plt.savefig('rf_confusion_matrix.png')
plt.show()

# Mettre à jour le tableau de comparaison des modèles
performance_summary = pd.DataFrame({
    'Modèle': ['KNN Classifier', 'SVM Classifier', 'Arbre de Décision Classifier', 'RandomForest Classifier'],
    'Précision': [accuracy_knn, accuracy_svm, accuracy_dt, accuracy_rf],
    'F1-Score': [f1_knn, f1_svm, f1_dt, f1_rf],
    'AUC-ROC': [roc_auc_knn, roc_auc_svm, roc_auc_dt, roc_auc_rf]
})

# Afficher le tableau mis à jour
print('\n🔍 Comparaison des performances des quatre modèles :')
print(tabulate(performance_summary, headers='keys', tablefmt='pretty'))

# Sélectionner le meilleur modèle (RandomForest généralement)
best_model = best_rf
print(f"\nLe meilleur modèle est : RandomForest Classifier")

# Créer une classe pour encapsuler le modèle et les fonctionnalités de recommandation
class MentalHealthRecommender:
    def __init__(self, model, preprocessor):
        self.model = model
        self.preprocessor = preprocessor

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

        # Prédire le niveau de risque
        X_user = user_df[selected_features]
        X_user_processed = self.preprocessor.transform(X_user)
        risk_level = self.model.predict(X_user_processed)[0]

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

# Créer une instance du recommandeur
recommender = MentalHealthRecommender(best_model, preprocessor)

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
example_recommendations = recommender.get_recommendations(example_user, example_activities)

# Afficher les recommandations
print("\n🔍 Exemple de recommandations :")
print(f"Niveau de risque : {example_recommendations['risk_level']}")
print(f"Score de santé mentale : {example_recommendations['mental_health_score']}")
if example_recommendations['professional_help']:
    print(f"Aide professionnelle recommandée : {example_recommendations['professional_help']}")
print("\nActivités recommandées :")
for activity in example_recommendations['activities']:
    print(f"- {activity}")
print("\nPratiques quotidiennes recommandées :")
for practice in example_recommendations['daily_practices']:
    print(f"- {practice}")

# Sauvegarder le modèle et le préprocesseur
print("\n🔍 Sauvegarde du modèle et du préprocesseur...")
model_dir = 'model'
os.makedirs(model_dir, exist_ok=True)

# Sauvegarder le modèle
joblib.dump(best_model, os.path.join(model_dir, 'mental_health_model.pkl'))
# Sauvegarder le préprocesseur
joblib.dump(preprocessor, os.path.join(model_dir, 'preprocessor.pkl'))
# Sauvegarder le recommandeur
joblib.dump(recommender, os.path.join(model_dir, 'recommender.pkl'))

print(f"Modèle sauvegardé dans le dossier '{model_dir}'")
print("Terminé !")