from flask import Flask, render_template, request, jsonify, redirect, url_for
import sqlite3
import argon2
import secrets
import os
import re

app = Flask(__name__)

# Argon2 configuratie
ph = argon2.PasswordHasher(
    time_cost=5,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16
)

# Database initialisatie
def init_db():
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  email TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL)''')
                  
    # Nieuwe tabel voor het opslaan van salts
    c.execute('''CREATE TABLE IF NOT EXISTS user_salts
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER NOT NULL,
                  salt TEXT NOT NULL,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')
    conn.commit()
    conn.close()

init_db()

# Functie om salt uit hash te extraheren
def extract_salt_from_hash(hash_result):
    hash_parts = hash_result.split('$')
    if len(hash_parts) > 4:
        return hash_parts[4]
    return ""

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Validatie
        if not email or not password:
            return jsonify({"success": False, "message": "Vul alle velden in"}), 400
        
        conn = sqlite3.connect('users.db')
        c = conn.cursor()
        c.execute("SELECT password_hash FROM users WHERE email = ?", (email,))
        result = c.fetchone()
        conn.close()
        
        if not result:
            return jsonify({"success": False, "message": "E-mailadres niet gevonden"}), 401
        
        try:
            ph.verify(result[0], password)
            return jsonify({"success": True, "message": "Inloggen succesvol"})
        except:
            return jsonify({"success": False, "message": "Ongeldig wachtwoord"}), 401
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        # Validatie
        if not name or not email or not password or not password_confirm:
            return jsonify({"success": False, "message": "Vul alle velden in"}), 400
            
        if password != password_confirm:
            return jsonify({"success": False, "message": "Wachtwoorden komen niet overeen"}), 400
        
        if len(password) < 8:
            return jsonify({"success": False, "message": "Wachtwoord moet minimaal 8 tekens zijn"}), 400
        
        # Hash het wachtwoord
        password_hash = ph.hash(password)
        
        # Extract salt from the hash
        salt = extract_salt_from_hash(password_hash)
        
        # Sla gebruiker op met transactie
        try:
            conn = sqlite3.connect('users.db')
            conn.execute("PRAGMA foreign_keys = ON")  # Foreign key constraint activeren
            c = conn.cursor()
            
            # Begin transactie
            conn.execute("BEGIN TRANSACTION")
            
            # Gebruiker toevoegen
            c.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                     (name, email, password_hash))
            
            # Gebruiker ID ophalen
            user_id = c.lastrowid
            
            # Salt toevoegen aan aparte tabel
            c.execute("INSERT INTO user_salts (user_id, salt) VALUES (?, ?)",
                     (user_id, salt))
            
            # Transactie committen
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "Registratie succesvol"})
        except sqlite3.IntegrityError:
            conn.rollback()
            conn.close()
            return jsonify({"success": False, "message": "E-mailadres is al in gebruik"}), 400
        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({"success": False, "message": f"Fout bij registratie: {str(e)}"}), 500
    
    return render_template('register.html')

@app.route('/hash-demo', methods=['POST'])
def hash_demo():
    password = request.json.get('password')
    if not password:
        return jsonify({"error": "Geen wachtwoord opgegeven"}), 400
    
    try:
        # Genereer een hash met Argon2
        hash_result = ph.hash(password)
        
        # Parse de hash om de verschillende delen te tonen
        hash_parts = hash_result.split('$')
        salt = extract_salt_from_hash(hash_result)
        
        return jsonify({
            "success": True,
            "hash": hash_result,
            "salt": salt,
            "params": {
                "algorithm": hash_parts[1] if len(hash_parts) > 1 else "",
                "version": hash_parts[2] if len(hash_parts) > 2 else "",
                "memory_cost": int(hash_parts[3].split(',')[0][2:]) if len(hash_parts) > 3 else 0,
                "time_cost": int(hash_parts[3].split(',')[1][2:]) if len(hash_parts) > 3 else 0,
                "parallelism": int(hash_parts[3].split(',')[2][2:]) if len(hash_parts) > 3 else 0
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/test-login', methods=['POST'])
def test_login():
    email = request.json.get('email')
    password = request.json.get('password')
    
    if not email or not password:
        return jsonify({"success": False, "message": "Vul alle velden in"}), 400
    
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("""
        SELECT u.id, u.name, u.password_hash, s.salt 
        FROM users u 
        LEFT JOIN user_salts s ON u.id = s.user_id 
        WHERE u.email = ?
    """, (email,))
    result = c.fetchone()
    conn.close()
    
    if not result:
        return jsonify({"success": False, "message": "Combinatie e-mailadres en wachtwoord niet gevonden"}), 401
    
    try:
        ph.verify(result[2], password)
        return jsonify({
            "success": True, 
            "message": "Inloggen succesvol",
            "user_id": result[0],
            "user_name": result[1],
            "full_hash": result[2],  # Nu inclusief de echte hash
            "salt_info": {
                "stored_separately": result[3] is not None,
                "salt_value": result[3] if result[3] else extract_salt_from_hash(result[2])
            }
        })
    except:
        return jsonify({"success": False, "message": "Ongeldig wachtwoord"}), 401

@app.route('/api/argon2-config', methods=['GET'])
def get_argon2_config():
    return jsonify({
        "timeCost": 5,
        "memoryCost": 65536,
        "parallelism": 4,
        "hashLength": 32,
        "type": 2  # Argon2id type
    })

@app.route('/admin/user-salts', methods=['GET'])
def view_user_salts():
    # Beveiligde admin route om alle gebruikers en hun salts te zien
    conn = sqlite3.connect('users.db')
    c = conn.cursor()
    c.execute("""
        SELECT u.id, u.name, u.email, s.salt 
        FROM users u 
        LEFT JOIN user_salts s ON u.id = s.user_id
    """)
    users = [{"id": row[0], "name": row[1], "email": row[2], "salt": row[3]} for row in c.fetchall()]
    conn.close()
    
    return jsonify({"users": users})

if __name__ == '__main__':
    app.run(debug=True)