# -*- coding: utf-8 -*-
"""
database.py

Purpose:
    Handles SQLite database connections, table schemas, and data persistence.
    Manages schemas for user profiles and diagnostic reports.
    Uses standard library sqlite3 for reliable offline operation.
"""

import os
import sqlite3
from datetime import datetime

DATABASE_FILE = os.path.join('instance', 'users.db')

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Ensures that parent directories are provisioned automatically.
    """
    os.makedirs(os.path.dirname(DATABASE_FILE), exist_ok=True)
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row  # Enables index-by-column name dictionary rows
    return conn

def init_db():
    """
    Initializes SQL tables if they do not exist.
    Tables:
        - users: Profile registration credentials and password hashes.
        - reports: Saved diagnostic records, symptoms matched, predictions, and timestamp metadata.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # User accounts schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Saved medical logs / diagnostic reports schema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diagnostic_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            symptoms TEXT NOT NULL,
            predicted_disease TEXT NOT NULL,
            confidence REAL NOT NULL,
            recommendations TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()
    print("SQLite database successfully initialized!")

def create_user(username, email, password_hash):
    """
    Inserts a newly registered user profile.
    Returns True on success, False if email or username is already taken.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            (username.strip(), email.strip().lower(), password_hash)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_user_by_email(email):
    """
    Fetches a user profile by email address.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
    conn.close()
    return row

def get_user_by_id(user_id):
    """
    Fetches a user profile by internal serial auto-increment ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    row = cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row

def save_diagnostic_report(user_id, symptoms, predicted_disease, confidence, recommendations):
    """
    Logs an executed symptom assessment report.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO diagnostic_reports (user_id, symptoms, predicted_disease, confidence, recommendations)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, symptoms, predicted_disease, confidence, recommendations))
        conn.commit()
        return cursor.lastrowid
    except Exception as e:
        print(f"Error saving diagnostic report: {e}")
        return None
    finally:
        conn.close()

def get_user_diagnostic_history(user_id):
    """
    Retrieves chronological diagnostic records logged by the active patient ID.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute('''
        SELECT * FROM diagnostic_reports 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ''', (user_id,)).fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    init_db()
