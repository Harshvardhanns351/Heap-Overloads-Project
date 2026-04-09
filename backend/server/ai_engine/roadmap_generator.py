from __future__ import annotations

import json
import logging
import os
from typing import List, Dict

import httpx

logger = logging.getLogger(__name__)

# ─── Curated fallbacks for all 6 CSE domains ─────────────────────────────────

_FALLBACKS: Dict[str, List[Dict]] = {
    "placement": [
        {"title": "Arrays & Strings", "node_type": "concept", "hours": 8, "description": "Two-pointer, sliding window, prefix sums, kadane's algorithm.", "resources": [{"label": "GFG Arrays", "url": "https://www.geeksforgeeks.org/array-data-structure/"}, {"label": "LeetCode Array Explore", "url": "https://leetcode.com/explore/learn/card/array-and-string/"}, {"label": "Striver Sheet", "url": "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/"}]},
        {"title": "Linked Lists", "node_type": "concept", "hours": 6, "description": "Singly, doubly, circular. Reverse, detect cycle, merge sorted lists.", "resources": [{"label": "Striver A2Z LL", "url": "https://takeuforward.org/data-structure/top-linkedlist-interview-questions-structured-path-with-video-solutions/"}, {"label": "GFG Linked List", "url": "https://www.geeksforgeeks.org/data-structures/linked-list/"}]},
        {"title": "Stacks & Queues", "node_type": "concept", "hours": 6, "description": "Monotonic stack, deque, next greater element, LRU cache.", "resources": [{"label": "GFG Stack", "url": "https://www.geeksforgeeks.org/stack-data-structure/"}, {"label": "NeetCode Stack", "url": "https://neetcode.io/roadmap"}]},
        {"title": "Binary Trees & BST", "node_type": "concept", "hours": 10, "description": "Traversals, LCA, diameter, BST insert/delete/search, balanced trees.", "resources": [{"label": "MIT OCW Trees", "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/"}, {"label": "Striver Trees", "url": "https://takeuforward.org/data-structure/top-tree-interview-questions-structured-path-with-video-solutions/"}]},
        {"title": "Graph Algorithms", "node_type": "concept", "hours": 12, "description": "BFS, DFS, Dijkstra, Bellman-Ford, topo sort, union-find, MST.", "resources": [{"label": "William Fiset Graphs", "url": "https://www.youtube.com/playlist?list=PLDV1Zeh2NRsDGO4--qE8yH72HFL1Km93P"}, {"label": "GFG Graph", "url": "https://www.geeksforgeeks.org/graph-data-structure-and-algorithms/"}]},
        {"title": "Dynamic Programming", "node_type": "practice", "hours": 15, "description": "1D/2D DP, LCS, Knapsack, DP on trees and graphs, bitmask DP.", "resources": [{"label": "Aditya Verma DP", "url": "https://www.youtube.com/playlist?list=PL_z_8CaSLPWekqhdCPmFohncHwz8TY2Go"}, {"label": "Striver DP Series", "url": "https://takeuforward.org/dynamic-programming/striver-s-dp-series-dynamic-programming/"}]},
        {"title": "System Design Basics", "node_type": "project", "hours": 10, "description": "URL shortener, rate limiter, consistent hashing, load balancing.", "resources": [{"label": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer"}, {"label": "Gaurav Sen", "url": "https://www.youtube.com/c/GauravSensei"}]},
        {"title": "Mock Interviews & OS/DBMS/CN", "node_type": "practice", "hours": 8, "description": "Core CS theory for interviews: OS scheduling, SQL queries, TCP/IP.", "resources": [{"label": "Pramp", "url": "https://www.pramp.com/"}, {"label": "InterviewBit", "url": "https://www.interviewbit.com/"}]},
    ],
    "system_design": [
        {"title": "Distributed Systems Fundamentals", "node_type": "concept", "hours": 8, "description": "CAP theorem, consistency models, replication, fault tolerance.", "resources": [{"label": "Designing Data-Intensive Apps", "url": "https://dataintensive.net/"}, {"label": "MIT 6.824", "url": "https://pdos.csail.mit.edu/6.824/"}]},
        {"title": "Database Internals", "node_type": "concept", "hours": 7, "description": "B-tree indexes, WAL, MVCC, sharding strategies, connection pooling.", "resources": [{"label": "Use The Index Luke", "url": "https://use-the-index-luke.com/"}, {"label": "Database Internals Book", "url": "https://www.databass.dev/"}]},
        {"title": "Caching & CDN", "node_type": "concept", "hours": 5, "description": "Redis, Memcached, cache invalidation, write-through vs write-back, CDN edge.", "resources": [{"label": "Redis Docs", "url": "https://redis.io/docs/"}, {"label": "Cloudflare Learning", "url": "https://www.cloudflare.com/learning/"}]},
        {"title": "Message Queues & Event Streaming", "node_type": "concept", "hours": 6, "description": "Kafka, RabbitMQ, pub-sub vs queue, at-least-once delivery, consumer groups.", "resources": [{"label": "Kafka Docs", "url": "https://kafka.apache.org/documentation/"}, {"label": "Confluent Kafka 101", "url": "https://developer.confluent.io/courses/apache-kafka/events/"}]},
        {"title": "API Design & Microservices", "node_type": "concept", "hours": 6, "description": "REST vs gRPC, API gateway, service mesh, circuit breaker, saga pattern.", "resources": [{"label": "Microservices.io", "url": "https://microservices.io/"}, {"label": "gRPC Docs", "url": "https://grpc.io/docs/"}]},
        {"title": "Design URL Shortener", "node_type": "project", "hours": 5, "description": "Hash functions, redirect logic, analytics, rate limiting.", "resources": [{"label": "Gaurav Sen", "url": "https://www.youtube.com/c/GauravSensei"}]},
        {"title": "Design Twitter / News Feed", "node_type": "project", "hours": 8, "description": "Fan-out on write vs read, timeline generation, ranking algorithms.", "resources": [{"label": "System Design Primer", "url": "https://github.com/donnemartin/system-design-primer"}]},
        {"title": "Design WhatsApp / Chat System", "node_type": "project", "hours": 8, "description": "WebSockets, message ordering, presence, end-to-end encryption basics.", "resources": [{"label": "High Scalability", "url": "http://highscalability.com/"}]},
    ],
    "web_development": [
        {"title": "HTML & CSS Mastery", "node_type": "concept", "hours": 6, "description": "Semantic HTML, Flexbox, Grid, responsive design, CSS variables.", "resources": [{"label": "MDN Web Docs", "url": "https://developer.mozilla.org/en-US/docs/Web"}, {"label": "CSS Tricks", "url": "https://css-tricks.com/"}]},
        {"title": "JavaScript Core", "node_type": "concept", "hours": 10, "description": "Closures, prototypes, async/await, event loop, ES6+ features.", "resources": [{"label": "javascript.info", "url": "https://javascript.info/"}, {"label": "You Don't Know JS", "url": "https://github.com/getify/You-Dont-Know-JS"}]},
        {"title": "React & State Management", "node_type": "concept", "hours": 12, "description": "Hooks, context, React Query, Zustand/Redux, performance optimization.", "resources": [{"label": "React Docs", "url": "https://react.dev/"}, {"label": "Scrimba React", "url": "https://scrimba.com/learn/learnreact"}]},
        {"title": "Node.js & Express", "node_type": "concept", "hours": 8, "description": "REST APIs, middleware, authentication, file uploads, error handling.", "resources": [{"label": "Node.js Docs", "url": "https://nodejs.org/en/docs/"}, {"label": "The Odin Project", "url": "https://www.theodinproject.com/"}]},
        {"title": "Databases: SQL & NoSQL", "node_type": "concept", "hours": 8, "description": "PostgreSQL, MongoDB, schema design, indexing, ORMs.", "resources": [{"label": "PostgreSQL Tutorial", "url": "https://www.postgresqltutorial.com/"}, {"label": "MongoDB University", "url": "https://university.mongodb.com/"}]},
        {"title": "Authentication & Security", "node_type": "concept", "hours": 5, "description": "JWT, OAuth2, bcrypt, CORS, CSRF, SQL injection prevention.", "resources": [{"label": "OWASP Top 10", "url": "https://owasp.org/www-project-top-ten/"}, {"label": "Auth0 Docs", "url": "https://auth0.com/docs/"}]},
        {"title": "Full Stack Project", "node_type": "project", "hours": 15, "description": "Build a complete CRUD app with auth, deployed to cloud.", "resources": [{"label": "Vercel", "url": "https://vercel.com/"}, {"label": "Railway", "url": "https://railway.app/"}]},
        {"title": "DevOps & Deployment", "node_type": "project", "hours": 6, "description": "Docker, CI/CD with GitHub Actions, Nginx, environment management.", "resources": [{"label": "Docker Docs", "url": "https://docs.docker.com/"}, {"label": "GitHub Actions", "url": "https://docs.github.com/en/actions"}]},
    ],
    "machine_learning": [
        {"title": "Python for ML", "node_type": "concept", "hours": 6, "description": "NumPy, Pandas, Matplotlib, data manipulation and visualization.", "resources": [{"label": "Kaggle Python", "url": "https://www.kaggle.com/learn/python"}, {"label": "CS50 Python", "url": "https://cs50.harvard.edu/python/2022/"}]},
        {"title": "Math for ML", "node_type": "concept", "hours": 8, "description": "Linear algebra, calculus (gradients), probability, statistics.", "resources": [{"label": "3Blue1Brown Linear Algebra", "url": "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab"}, {"label": "Khan Academy Stats", "url": "https://www.khanacademy.org/math/statistics-probability"}]},
        {"title": "Classical ML Algorithms", "node_type": "concept", "hours": 10, "description": "Linear/logistic regression, decision trees, SVM, k-means, PCA.", "resources": [{"label": "Scikit-learn Docs", "url": "https://scikit-learn.org/stable/"}, {"label": "StatQuest", "url": "https://www.youtube.com/c/joshstarmer"}]},
        {"title": "Neural Networks & Deep Learning", "node_type": "concept", "hours": 12, "description": "Backpropagation, CNNs, RNNs, batch norm, dropout, optimizers.", "resources": [{"label": "fast.ai", "url": "https://www.fast.ai/"}, {"label": "Deep Learning Book", "url": "https://www.deeplearningbook.org/"}]},
        {"title": "PyTorch Fundamentals", "node_type": "practice", "hours": 8, "description": "Tensors, autograd, custom datasets, training loops, GPU usage.", "resources": [{"label": "PyTorch Docs", "url": "https://pytorch.org/docs/stable/index.html"}, {"label": "PyTorch Tutorial", "url": "https://pytorch.org/tutorials/"}]},
        {"title": "NLP or Computer Vision", "node_type": "practice", "hours": 10, "description": "Transformers/BERT for NLP or ResNet/YOLO for CV — pick your domain.", "resources": [{"label": "HuggingFace", "url": "https://huggingface.co/learn"}, {"label": "CS231n", "url": "http://cs231n.stanford.edu/"}]},
        {"title": "ML Project End-to-End", "node_type": "project", "hours": 12, "description": "Data collection → EDA → model → evaluation → deployment with FastAPI.", "resources": [{"label": "Kaggle", "url": "https://www.kaggle.com/"}, {"label": "MLflow", "url": "https://mlflow.org/"}]},
    ],
    "competitive_programming": [
        {"title": "STL & Language Mastery", "node_type": "concept", "hours": 5, "description": "C++ STL: vector, map, set, priority_queue, sort, lower_bound.", "resources": [{"label": "CP-Algorithms", "url": "https://cp-algorithms.com/"}, {"label": "Codeforces EDU", "url": "https://codeforces.com/edu/courses"}]},
        {"title": "Number Theory", "node_type": "concept", "hours": 6, "description": "Sieve of Eratosthenes, modular arithmetic, GCD, fast exponentiation.", "resources": [{"label": "CP-Algorithms Math", "url": "https://cp-algorithms.com/algebra/sieve-of-eratosthenes.html"}]},
        {"title": "Sorting & Searching", "node_type": "concept", "hours": 5, "description": "Binary search on answer, merge sort, counting sort, ternary search.", "resources": [{"label": "USACO Guide", "url": "https://usaco.guide/"}]},
        {"title": "Graph Theory", "node_type": "concept", "hours": 10, "description": "BFS/DFS, shortest paths, MST, SCC, bridges, articulation points.", "resources": [{"label": "CP-Algorithms Graphs", "url": "https://cp-algorithms.com/graph/breadth-first-search.html"}, {"label": "William Fiset", "url": "https://www.youtube.com/c/WilliamFiset-videos"}]},
        {"title": "Dynamic Programming", "node_type": "practice", "hours": 14, "description": "Classic DP, bitmask DP, digit DP, DP on trees, interval DP.", "resources": [{"label": "AtCoder DP Contest", "url": "https://atcoder.jp/contests/dp"}, {"label": "CSES DP", "url": "https://cses.fi/problemset/"}]},
        {"title": "Advanced Data Structures", "node_type": "concept", "hours": 10, "description": "Segment tree, BIT/Fenwick, sparse table, DSU, trie.", "resources": [{"label": "CP-Algorithms DS", "url": "https://cp-algorithms.com/data_structures/segment_tree.html"}]},
        {"title": "Contest Practice", "node_type": "practice", "hours": 12, "description": "Solve Codeforces Div 2/3, CSES problem set, virtual contests.", "resources": [{"label": "Codeforces", "url": "https://codeforces.com/"}, {"label": "CSES Problem Set", "url": "https://cses.fi/problemset/"}]},
    ],
    "startup": [
        {"title": "Product Thinking", "node_type": "concept", "hours": 4, "description": "User research, problem-solution fit, MVP definition, metrics.", "resources": [{"label": "YC Startup School", "url": "https://www.startupschool.org/"}, {"label": "The Mom Test", "url": "https://www.momtestbook.com/"}]},
        {"title": "Full Stack Basics", "node_type": "concept", "hours": 10, "description": "React frontend, Node/FastAPI backend, PostgreSQL, REST APIs.", "resources": [{"label": "The Odin Project", "url": "https://www.theodinproject.com/"}, {"label": "Full Stack Open", "url": "https://fullstackopen.com/en/"}]},
        {"title": "Ship Fast: Build an MVP", "node_type": "project", "hours": 12, "description": "Build and deploy a working product in 2 weeks. Focus on core loop.", "resources": [{"label": "Vercel", "url": "https://vercel.com/"}, {"label": "Supabase", "url": "https://supabase.com/"}]},
        {"title": "Auth & Payments", "node_type": "concept", "hours": 5, "description": "Clerk/Auth0 for auth, Stripe for payments, webhooks.", "resources": [{"label": "Stripe Docs", "url": "https://stripe.com/docs"}, {"label": "Clerk Docs", "url": "https://clerk.com/docs"}]},
        {"title": "Growth & Analytics", "node_type": "concept", "hours": 4, "description": "Posthog, Mixpanel, A/B testing, funnel analysis, retention.", "resources": [{"label": "PostHog", "url": "https://posthog.com/"}, {"label": "Reforge", "url": "https://www.reforge.com/"}]},
        {"title": "Cloud & Scaling", "node_type": "project", "hours": 6, "description": "AWS/GCP basics, Docker, CI/CD, monitoring with Sentry.", "resources": [{"label": "AWS Free Tier", "url": "https://aws.amazon.com/free/"}, {"label": "Sentry Docs", "url": "https://docs.sentry.io/"}]},
    ],
    "default": [
        {"title": "Programming Fundamentals", "node_type": "concept", "hours": 8, "description": "Variables, loops, functions, OOP, recursion in Python/C++.", "resources": [{"label": "CS50", "url": "https://cs50.harvard.edu/x/"}, {"label": "Python.org Tutorial", "url": "https://docs.python.org/3/tutorial/"}]},
        {"title": "Data Structures", "node_type": "concept", "hours": 10, "description": "Arrays, linked lists, stacks, queues, trees, graphs, hash maps.", "resources": [{"label": "Visualgo", "url": "https://visualgo.net/en"}, {"label": "GFG DSA", "url": "https://www.geeksforgeeks.org/data-structures/"}]},
        {"title": "Algorithms", "node_type": "concept", "hours": 10, "description": "Sorting, searching, divide & conquer, greedy, dynamic programming.", "resources": [{"label": "CLRS", "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"}, {"label": "LeetCode", "url": "https://leetcode.com/"}]},
        {"title": "DBMS & SQL", "node_type": "concept", "hours": 6, "description": "Normalization, transactions, ACID, joins, query optimization.", "resources": [{"label": "SQLZoo", "url": "https://sqlzoo.net/"}, {"label": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/"}]},
        {"title": "Operating Systems", "node_type": "concept", "hours": 6, "description": "Processes, threads, memory management, file systems, scheduling.", "resources": [{"label": "OSTEP", "url": "https://pages.cs.wisc.edu/~remzi/OSTEP/"}, {"label": "GFG OS", "url": "https://www.geeksforgeeks.org/operating-systems/"}]},
        {"title": "Computer Networks", "node_type": "concept", "hours": 6, "description": "OSI layers, TCP/IP, DNS, HTTP/HTTPS, sockets.", "resources": [{"label": "Kurose & Ross", "url": "https://gaia.cs.umass.edu/kurose_ross/index.php"}, {"label": "Cloudflare Learning", "url": "https://www.cloudflare.com/learning/"}]},
        {"title": "Capstone Project", "node_type": "project", "hours": 12, "description": "Build a full-stack project applying all concepts learned.", "resources": [{"label": "GitHub", "url": "https://github.com/"}, {"label": "Dev.to", "url": "https://dev.to/"}]},
    ],
}


def generate_roadmap_fallback(goal: str, branch: str = "CSE") -> List[Dict]:
    g = goal.lower()
    if any(k in g for k in ["placement", "faang", "interview", "crack", "job"]):
        return _FALLBACKS["placement"]
    if any(k in g for k in ["system design", "architect", "scale", "distributed"]):
        return _FALLBACKS["system_design"]
    if any(k in g for k in ["web", "full stack", "frontend", "backend", "react", "node"]):
        return _FALLBACKS["web_development"]
    if any(k in g for k in ["ml", "machine learning", "ai", "deep learning", "data science"]):
        return _FALLBACKS["machine_learning"]
    if any(k in g for k in ["competitive", "cp", "codeforces", "icpc", "programming contest"]):
        return _FALLBACKS["competitive_programming"]
    if any(k in g for k in ["startup", "intern", "product", "ship"]):
        return _FALLBACKS["startup"]
    return _FALLBACKS["default"]


# ─── Groq call ────────────────────────────────────────────────────────────────

def _weak_subjects(marks: List[Dict]) -> str:
    weak = []
    for m in marks:
        pct = m.get("percentage") or (
            (m.get("score", 0) / m.get("max_score", 100)) * 100
            if m.get("max_score") else None
        )
        if pct is not None and pct < 60:
            weak.append(m.get("subject", ""))
    return ", ".join(w for w in weak if w) or "none"


def generate_roadmap(
    goal: str,
    semester: int,
    branch: str,
    marks: List[Dict],
    duration_weeks: int = 4,
) -> List[Dict]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.info("No GROQ_API_KEY — using curated fallback roadmap")
        return generate_roadmap_fallback(goal, branch)

    node_count = min(8, max(4, duration_weeks * 2))
    weak = _weak_subjects(marks)

    prompt = (
        f"Generate a {node_count}-node personalized learning roadmap for a {branch} engineering student.\n"
        f"Goal: {goal}\nSemester: {semester}, Duration: {duration_weeks} weeks\n"
        f"Weak subjects (prioritize these): {weak}\n\n"
        "Rules:\n"
        "- Return ONLY a JSON array, no markdown, no explanation\n"
        "- Each node must have: title, node_type (concept|practice|project), hours (int), description (1-2 sentences), resources (array of {label, url}), prereq_ids (empty array)\n"
        "- Include 2-3 real, working resource URLs per node (YouTube, official docs, free courses)\n"
        "- Order nodes from foundational to advanced\n"
        "- First node status should be most beginner-friendly\n\n"
        f"Return exactly {node_count} nodes as a JSON array."
    )

    try:
        logger.info(f"Calling Groq for roadmap: goal={goal}, branch={branch}, weeks={duration_weeks}")
        with httpx.Client(timeout=45) as client:
            resp = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama3-70b-8192",
                    "temperature": 0.4,
                    "max_tokens": 3500,
                    "messages": [
                        {"role": "system", "content": "You are an expert CS curriculum designer. Return ONLY valid JSON arrays with no markdown fences or extra text."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            logger.info("Groq responded successfully")

            # Strip markdown fences
            if "```" in content:
                parts = content.split("```")
                for part in parts:
                    part = part.strip()
                    if part.startswith("json"):
                        part = part[4:].strip()
                    if part.startswith("["):
                        content = part
                        break

            nodes = json.loads(content)
            if isinstance(nodes, list) and len(nodes) >= 3:
                logger.info(f"Groq generated {len(nodes)} nodes")
                return nodes
            logger.warning("Groq returned invalid structure, using fallback")
    except Exception as e:
        logger.warning(f"Groq roadmap generation failed: {e} — using curated fallback")

    return generate_roadmap_fallback(goal, branch)
