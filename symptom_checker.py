# -*- coding: utf-8 -*-
"""
symptom_checker.py

Purpose:
    Handles Machine Learning model training, evaluation, saving, and prediction.
    Utilizes Scikit-Learn's RandomForestClassifier to train on dataset.csv.
    Saves and loads serialization binaries (model.pkl and label_encoder.pkl).
    Provides robust multi-class probability extraction to find the Top 3 predictions.
"""

import os
import pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

class SymptomClassifier:
    def __init__(self, dataset_path='dataset.csv', model_path='model.pkl', encoder_path='label_encoder.pkl'):
        self.dataset_path = dataset_path
        self.model_path = model_path
        self.encoder_path = encoder_path
        self.model = None
        self.label_encoder = None
        self.symptom_columns = []

    def load_data_and_train(self):
        """
        Loads the training CSV, cleanses any missing values, encodes disease labels,
        and trains a Scikit-Learn RandomForestClassifier model. Saves model state.
        """
        if not os.path.exists(self.dataset_path):
            raise FileNotFoundError(f"Training dataset not found at: {self.dataset_path}")

        # Load dataset
        df = pd.read_csv(self.dataset_path)

        # Handle missing values by forward-filling or zeroing out symptom flags
        df.fillna(0, inplace=True)

        # Separate symptoms (features) and prognosis (labels)
        X = df.drop('prognosis', axis=1)
        y = df['prognosis']

        self.symptom_columns = list(X.columns)

        # Encode labels dynamically (never hardcode disease lists)
        self.label_encoder = LabelEncoder()
        y_encoded = self.label_encoder.fit_transform(y)

        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

        # Train Random Forest Classifier
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)

        # Calculate accuracy score
        train_acc = self.model.score(X_train, y_train)
        test_acc = self.model.score(X_test, y_test)
        print(f"ML Model Trained Successfully!")
        print(f"Training Accuracy: {train_acc * 100:.2f}%")
        print(f"Testing Accuracy: {test_acc * 100:.2f}%")

        # Save binaries
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        with open(self.encoder_path, 'wb') as f:
            pickle.dump(self.label_encoder, f)

        # Save symptom features schema
        with open('symptoms_schema.pkl', 'wb') as f:
            pickle.dump(self.symptom_columns, f)

    def load_model(self):
        """
        Loads pre-trained model, label encoder, and feature columns schema.
        Automatically triggers training if binaries do not exist.
        """
        if (not os.path.exists(self.model_path) or 
            not os.path.exists(self.encoder_path) or 
            not os.path.exists('symptoms_schema.pkl')):
            print("Model files missing. Training from scratch using dataset.csv...")
            self.load_data_and_train()
            return

        with open(self.model_path, 'rb') as f:
            self.model = pickle.load(f)
        with open(self.encoder_path, 'rb') as f:
            self.label_encoder = pickle.load(f)
        with open('symptoms_schema.pkl', 'rb') as f:
            self.symptom_columns = pickle.load(f)
        print("Model binaries and label encoders loaded successfully!")

    def predict(self, user_symptoms):
        """
        Predicts disease and confidence scores given a list of user-selected symptoms.
        Returns top 3 predictions with probabilities and corresponding indices.
        """
        if self.model is None or self.label_encoder is None:
            self.load_model()

        # Construct input array matching training columns
        input_vector = np.zeros(len(self.symptom_columns))
        matched_count = 0

        # Normalize symptom casing and match index
        normalized_user_symptoms = [s.strip().lower().replace(' ', '_') for s in user_symptoms]
        for s in normalized_user_symptoms:
            if s in self.symptom_columns:
                idx = self.symptom_columns.index(s)
                input_vector[idx] = 1
                matched_count += 1

        if matched_count == 0:
            return {
                "error": "No recognizable symptoms were supplied.",
                "predictions": []
            }

        # Reshape input for prediction
        input_data = input_vector.reshape(1, -1)
        
        # Calculate disease probability distribution
        probabilities = self.model.predict_proba(input_data)[0]
        
        # Sort indices by probability descending
        top_indices = np.argsort(probabilities)[::-1][:3]
        
        results = []
        for rank, idx in enumerate(top_indices):
            disease = self.label_encoder.classes_[idx]
            prob = float(probabilities[idx]) * 100
            if prob > 0:
                results.append({
                    "rank": rank + 1,
                    "disease": disease,
                    "confidence": round(prob, 2)
                })

        return {
            "symptoms_matched": matched_count,
            "predictions": results
        }

    def get_all_symptoms(self):
        """
        Returns list of all active training features (symptoms).
        """
        if not self.symptom_columns:
            self.load_model()
        # Clean symptom labels for display format
        return [s.replace('_', ' ').title() for s in self.symptom_columns]

# Initialize static checker module
classifier = SymptomClassifier()

if __name__ == "__main__":
    # If run as standalone, train the model
    classifier.load_data_and_train()
    # Test prediction
    test_symptoms = ['itching', 'skin_rash']
    print(f"Testing with symptoms: {test_symptoms}")
    print(classifier.predict(test_symptoms))
