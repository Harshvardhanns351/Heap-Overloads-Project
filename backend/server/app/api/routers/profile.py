"""
profile.py — Unified student profile router
GET  /api/profile/me                  → own full profile bundle
PATCH /api/profile/me                 → update bio/links
GET  /api/profile/student/{user_id}   → teacher/admin view any student
GET  /api/profile/students/list       → p