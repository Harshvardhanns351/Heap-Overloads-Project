import sys
import os

# Add backend/db connection to path
sys.path.append(os.path.join(os.getcwd(), "backend", "db connection"))

from sqlmodel import Session, select, create_engine, SQLModel
from app.database import engine, create_db
from app.models import User, Mark, Roadmap, RoadmapNode, CodingProfile
from app.auth.security import hash_password

def seed():
    # Ensure tables exist
    create_db()
    
    with Session(engine) as session:
        # 1. Create Users
        demo = [
            ("Rahul Sharma", "rahul@college.edu", "student"),
            ("Dr. Priya Menon", "priya@college.edu", "teacher"),
            ("Admin", "admin@college.edu", "admin"),
        ]
        created_users = {}
        for name, email, role in demo:
            u = session.exec(select(User).where(User.email == email)).first()
            if not u:
                hp = hash_password("password")
                u = User(name=name, email=email, role=role, hashed_password=hp)
                session.add(u)
                session.commit()
                session.refresh(u)
            created_users[email] = u

        rahul = created_users["rahul@college.edu"]
        
        # 2. Add Marks
        marks = [
            ("DSA", 72, 100, 6),
            ("OS", 58, 100, 6),
            ("DBMS", 81, 100, 6),
            ("CN", 63, 100, 6),
            ("ML", 45, 100, 6),
        ]
        for sub, sc, mx, sem in marks:
            m = session.exec(select(Mark).where(Mark.student_id == rahul.id).where(Mark.subject == sub)).first()
            if not m:
                m = Mark(student_id=rahul.id, subject=sub, score=sc, max_score=mx, semester=sem)
                session.add(m)

        # 3. Add Roadmap
        rm = session.exec(select(Roadmap).where(Roadmap.student_id == rahul.id)).first()
        if not rm:
            rm = Roadmap(student_id=rahul.id, goal="crack placements", semester=6, branch="CSE")
            session.add(rm)
            session.commit()
            session.refresh(rm)
            
            nodes = [
                (0, "Arrays & Strings", "Master array manipulation", 8, "concept", "completed"),
                (1, "Linked Lists", "Singly, doubly, circular", 6, "concept", "completed"),
                (2, "Binary Search Trees", "BST operations", 8, "concept", "current"),
                (3, "Graph Fundamentals", "BFS, DFS, cycle detection", 12, "concept", "upcoming"),
            ]
            for idx, title, desc, hrs, typ, stat in nodes:
                n = RoadmapNode(
                    roadmap_id=rm.id,
                    order_index=idx,
                    title=title,
                    description=desc,
                    hours=hrs,
                    node_type=typ,
                    status=stat,
                    prereq_ids_json="[]",
                    resources_json="[]"
                )
                session.add(n)

        # 4. Add Coding Profile
        cp = session.exec(select(CodingProfile).where(CodingProfile.student_id == rahul.id)).first()
        if not cp:
            cp = CodingProfile(
                student_id=rahul.id,
                platform="leetcode",
                username="rahul_sharma_dev",
                solved_total=87,
                easy=52,
                medium=30,
                hard=5
            )
            session.add(cp)

        session.commit()
        print("Success: Seeded all data.")

if __name__ == "__main__":
    seed()
