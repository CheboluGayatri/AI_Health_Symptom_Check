# -*- coding: utf-8 -*-
"""
auth.py

Purpose:
    Configures user identity mappings for Flask-Login session management.
    Defines Flask-Login compatible User model and loading routines.
    Utilizes werkzeug.security for cryptographic password hashing.
"""

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
import database

class User(UserMixin):
    """
    Flask-Login compatible User model mapping database credentials to active sessions.
    """
    def __init__(self, id, username, email, password_hash, created_at):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.created_at = created_at

    @staticmethod
    def get_by_id(user_id):
        """
        Retrieves user session active state using local SQLite records.
        """
        row = database.get_user_by_id(user_id)
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                created_at=row['created_at']
            )
        return None

    @staticmethod
    def get_by_email(email):
        """
        Queries database for email mapping. Returns User class if matched.
        """
        row = database.get_user_by_email(email)
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                password_hash=row['password_hash'],
                created_at=row['created_at']
            )
        return None

    @staticmethod
    def register(username, email, password):
        """
        Cryptographically hashes and saves a new user registration profile.
        """
        hashed = generate_password_hash(password, method='pbkdf2:sha256')
        return database.create_user(username, email, hashed)

    def verify_password(self, password):
        """
        Verifies inputted login password against cryptographic hash stored in DB.
        """
        return check_password_hash(self.password_hash, password)

# User loader helper for Flask-Login setup
def load_user(user_id):
    """
    Session loader for Flask-Login. Converts numeric cookie string to User class representation.
    """
    return User.get_by_id(int(user_id))
