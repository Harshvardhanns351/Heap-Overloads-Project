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
    # "prompt_engineering": [
    #     {"title": "LLM Fundamentals", "node_type": "concept", "hours": 6, "description": "How large language models work: tokenization, attention, temperature, top-p, context windows. Understand GPT, Claude, Gemini, Llama architectures at a conceptual level.", "resources": [{"label": "Andrej Karpathy — Intro to LLMs", "url": "https://www.youtube.com/watch?v=zjkBMFhNj_g"}, {"label": "OpenAI Tokenizer", "url": "https://platform.openai.com/tokenizer"}, {"label": "Lilian Weng — LLM Powered Agents", "url": "https://lilianweng.github.io/posts/2023-06-23-agent/"}]},
    #     {"title": "Prompt Engineering Techniques", "node_type": "concept", "hours": 7, "description": "Zero-shot, few-shot, chain-of-thought, tree-of-thought, ReAct, self-consistency. Learn when and why each technique works.", "resources": [{"label": "Prompt Engineering Guide", "url": "https://www.promptingguide.ai/"}, {"label": "OpenAI Prompt Engineering", "url": "https://platform.openai.com/docs/guides/prompt-engineering"}, {"label": "Learn Prompting", "url": "https://learnprompting.org/"}]},
    #     {"title": "System Prompts & Instruction Tuning", "node_type": "concept", "hours": 5, "description": "Crafting effective system prompts, persona design, output formatting constraints, role-playing patterns, and how instruction-tuned models differ from base models.", "resources": [{"label": "Anthropic Prompt Library", "url": "https://docs.anthropic.com/en/prompt-library/library"}, {"label": "OpenAI Cookbook", "url": "https://cookbook.openai.com/"}]},
    #     {"title": "AI Red Teaming Fundamentals", "node_type": "concept", "hours": 8, "description": "What AI red teaming is, threat modeling for LLMs, categories of failure: hallucination, bias, toxicity, privacy leakage, misuse. OWASP LLM Top 10.", "resources": [{"label": "OWASP LLM Top 10", "url": "https://owasp.org/www-project-top-10-for-large-language-model-applications/"}, {"label": "Microsoft AI Red Team", "url": "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/red-teaming"}, {"label": "Anthropic Red Teaming", "url": "https://www.anthropic.com/research/red-teaming-language-models-to-reduce-harms"}]},
    #     {"title": "Jailbreaks & Prompt Injection", "node_type": "practice", "hours": 9, "description": "Direct and indirect prompt injection, jailbreak techniques (DAN, role-play bypasses, token smuggling), defense strategies, and how to test for them systematically.", "resources": [{"label": "Prompt Injection Explained", "url": "https://simonwillison.net/2023/Apr/14/worst-that-can-happen/"}, {"label": "Gandalf Challenge", "url": "https://gandalf.lakera.ai/"}, {"label": "HackAPrompt", "url": "https://www.aicrowd.com/challenges/hackaprompt-2023"}]},
    #     {"title": "Automated Red Teaming & Evaluation", "node_type": "practice", "hours": 8, "description": "Using LLMs to red-team other LLMs, building adversarial test suites, evaluation frameworks (HELM, EleutherAI LM Eval), and responsible disclosure.", "resources": [{"label": "HELM Benchmark", "url": "https://crfm.stanford.edu/helm/"}, {"label": "LM Evaluation Harness", "url": "https://github.com/EleutherAI/lm-evaluation-harness"}, {"label": "Garak LLM Vulnerability Scanner", "url": "https://github.com/leondz/garak"}]},
    #     {"title": "RAG & Agentic System Security", "node_type": "concept", "hours": 7, "description": "Security considerations in RAG pipelines, tool-use agents, and multi-agent systems. Data poisoning, exfiltration via tool calls, and sandboxing strategies.", "resources": [{"label": "LangChain Security", "url": "https://python.langchain.com/docs/security"}, {"label": "NIST AI RMF", "url": "https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%201.0.pdf"}]},
    #     {"title": "Red Team Report & Responsible AI", "node_type": "project", "hours": 10, "description": "Conduct a structured red team exercise on a public LLM API or open-source model. Document findings, severity ratings, and mitigations in a professional report.", "resources": [{"label": "AI Incident Database", "url": "https://incidentdatabase.ai/"}, {"label": "Google SAIF", "url": "https://saif.google/"}, {"label": "HuggingFace Model Cards", "url": "https://huggingface.co/docs/hub/model-cards"}]},
    # ],
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


def _generic_fallback(goal: str, difficulty: str = "intermediate", timeframe_days: int = 30) -> List[Dict]:
    """Topic-aware fallback for any goal not in the curated list."""
    templates = {
        "beginner":     ["Introduction & Overview", "Core Concepts", "Hands-on Practice", "Mini Project"],
        "intermediate": ["Foundations", "Core Topics", "Advanced Concepts", "Practical Application", "Real-world Project"],
        "advanced":     ["Architecture & Theory", "Advanced Implementation", "Performance & Optimization", "System Design", "Expert Capstone"],
    }
    steps = templates.get(difficulty, templates["intermediate"])
    hours_each = max(3, timeframe_days // len(steps))
    return [
        {
            "title": f"{goal} — {step}",
            "description": (
                f"Study the {step.lower()} aspects of {goal}. "
                f"This node covers essential concepts and practical skills "
                f"for {difficulty}-level learners working toward mastery of {goal}."
            ),
            "hours": hours_each,
            "node_type": "project" if "Project" in step or "Capstone" in step else "practice" if "Practice" in step or "Application" in step else "concept",
            "prereq_ids": [],
            "resources": [],
        }
        for step in steps
    ]


def generate_roadmap_fallback(goal: str, branch: str = "CSE", difficulty: str = "intermediate", timeframe_days: int = 30) -> List[Dict]:
    g = goal.lower()
    if any(k in g for k in ["placement", "faang", "interview", "crack", "job"]):
        return _FALLBACKS["placement"]
    if any(k in g for k in ["system design", "architect", "scale", "distributed"]):
        return _FALLBACKS["system_design"]
    if any(k in g for k in ["web", "full stack", "frontend", "backend", "react", "node"]):
        return _FALLBACKS["web_development"]
    if any(k in g for k in ["prompt engineering", "red team", "red-team", "jailbreak", "llm security", "ai safety", "prompt injection"]):
        return _FALLBACKS.get("prompt_engineering", _FALLBACKS["default"])
    if any(k in g for k in ["ml", "machine learning", "deep learning", "data science"]):
        return _FALLBACKS["machine_learning"]
    if any(k in g for k in ["competitive", "cp", "codeforces", "icpc", "programming contest"]):
        return _FALLBACKS["competitive_programming"]
    if any(k in g for k in ["startup", "intern", "product", "ship"]):
        return _FALLBACKS["startup"]
    if any(k in g for k in ["ai", "artificial intelligence", "generative ai", "gen ai"]):
        return _FALLBACKS["machine_learning"]
    # Generic topic-aware fallback — uses the actual goal as the topic
    return _generic_fallback(goal)


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
    difficulty: str = "intermediate",
    timeframe_days: int = 30,
) -> List[Dict]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.info("No GROQ_API_KEY — using curated fallback roadmap")
        return generate_roadmap_fallback(goal, branch, difficulty, timeframe_days)

    # Node count: explicit matrix keyed by (timeframe_days, difficulty)
    _NODE_COUNT = {
        (1,  "beginner"): 3, (1,  "intermediate"): 3, (1,  "advanced"): 4,
        (5,  "beginner"): 4, (5,  "intermediate"): 5, (5,  "advanced"): 5,
        (10, "beginner"): 5, (10, "intermediate"): 6, (10, "advanced"): 6,
        (15, "beginner"): 5, (15, "intermediate"): 6, (15, "advanced"): 7,
        (30, "beginner"): 6, (30, "intermediate"): 7, (30, "advanced"): 8,
    }
    node_count = _NODE_COUNT.get(
        (timeframe_days, difficulty),
        _NODE_COUNT.get((timeframe_days, "intermediate"), 6)
    )
    weak = _weak_subjects(marks)

    depth_desc = {
        "beginner": "introductory level — focus on fundamentals, simple examples, avoid jargon",
        "intermediate": "solid understanding — cover core concepts with practical examples",
        "advanced": "deep mastery — include edge cases, internals, advanced patterns, tradeoffs",
    }.get(difficulty, "intermediate level")

    system_prompt = (
        "You are an expert curriculum designer. "
        "You MUST generate a roadmap specifically about the given topic. "
        "NEVER substitute generic DSA/programming content unless the topic explicitly asks for it. "
        "Every node title and description MUST mention the actual topic. "
        "Return ONLY a valid JSON array with no markdown fences or extra text."
    )

    def _build_prompt(strict: bool = False) -> str:
        strictness = (
            "\nCRITICAL: Every single node title MUST contain a keyword from the topic. "
            "Do NOT generate generic content.\n"
        ) if strict else ""
        return (
            f"Generate a {node_count}-node learning roadmap for the topic: \"{goal}\"\n"
            f"{strictness}"
            f"Student context: {branch} engineering, Semester {semester}\n"
            f"Difficulty: {difficulty} ({depth_desc})\n"
            f"Timeframe: {timeframe_days} days\n"
            f"Weak subjects to reinforce: {weak}\n\n"
            "Rules:\n"
            f"- The roadmap is SPECIFICALLY about \"{goal}\" — not generic programming\n"
            "- Return ONLY a JSON array, no markdown, no explanation\n"
            "- Each node: title (must reference the topic), node_type (concept|practice|project), "
            "hours (int), description (2-3 sentences, topic-specific), "
            "resources (empty array []), prereq_ids ([])\n"
            "- Order nodes from foundational to advanced\n"
            f"Return exactly {node_count} nodes as a JSON array."
        )

    def _validate(nodes: list) -> bool:
        if not isinstance(nodes, list) or len(nodes) < max(3, node_count - 1):
            return False
        goal_words = {w for w in goal.lower().split() if len(w) > 3}
        if not goal_words:
            return True
        relevant = sum(
            1 for n in nodes
            if any(w in n.get("title", "").lower() or w in n.get("description", "").lower()
                   for w in goal_words)
        )
        return relevant >= len(nodes) * 0.5

    for attempt in range(3):
        try:
            prompt = _build_prompt(strict=(attempt > 0))
            logger.info(f"Groq attempt {attempt+1}: goal={goal}, difficulty={difficulty}, days={timeframe_days}, nodes={node_count}")
            with httpx.Client(timeout=45) as client:
                resp = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "temperature": max(0.2, 0.4 - attempt * 0.1),
                        "max_tokens": 3500,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"].strip()
                logger.info(f"Groq attempt {attempt+1} responded, length={len(content)}")

                if "```" in content:
                    for part in content.split("```"):
                        part = part.strip().lstrip("json").strip()
                        if part.startswith("["):
                            content = part
                            break

                nodes = json.loads(content)
                if _validate(nodes):
                    logger.info(f"Groq generated {len(nodes)} valid nodes on attempt {attempt+1}")
                    return nodes
                logger.warning(f"Groq attempt {attempt+1}: validation failed — nodes don't match topic '{goal}'")
        except Exception as e:
            logger.warning(f"Groq attempt {attempt+1} failed: {e}")

    logger.warning(f"All Groq attempts failed for goal='{goal}' — using topic-aware fallback")
    return generate_roadmap_fallback(goal, branch, difficulty, timeframe_days)


# ─── Resource regeneration ────────────────────────────────────────────────────

def _build_resource_queries(node_title: str, node_description: str, goal: str, difficulty: str) -> List[Dict]:
    """
    Build targeted search queries from node title keywords.
    Avoids Groq timeout by not calling LLM for query generation.
    Strips stop words so ArXiv/GitHub get precise queries.
    """
    _STOP = {"and", "the", "for", "with", "in", "of", "to", "a", "an",
             "is", "are", "how", "what", "introduction", "fundamentals",
             "basics", "overview", "project", "advanced", "using", "via"}
    words = [w for w in node_title.lower().split() if w not in _STOP and len(w) > 3]
    core = " ".join(words[:4]) or goal

    depth_suffix = {
        "beginner": "tutorial beginner",
        "intermediate": "deep dive tutorial 2024",
        "advanced": "advanced architecture production",
    }.get(difficulty, "tutorial")

    return [
        {"type": "github_repo",    "query": f"{core} examples"},
        {"type": "youtube_video",  "query": f"{core} {depth_suffix}"},
        {"type": "research_paper", "query": core},
    ]


def generate_resources(node_title: str, node_description: str, goal: str, difficulty: str = "intermediate", timeframe_days: int = 30) -> List[Dict]:
    """
    Hybrid resource generation:
      1. Build targeted search queries from node title (no Groq — avoids timeout)
      2. Real APIs (GitHub, ArXiv, YouTube) fetch actual URLs
      3. Curated verified fallbacks fill any gaps
    """
    import asyncio
    from ai_engine.resource_fetcher import fetch_resources_for_queries, get_curated

    resource_count = {1: 3, 5: 4, 10: 5, 15: 6, 30: 7}.get(timeframe_days, 5)

    queries = _build_resource_queries(node_title, node_description, goal, difficulty)

    # Fetch real resources from APIs in a fresh thread (avoids event loop conflicts)
    try:
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(asyncio.run, fetch_resources_for_queries(queries, topic=goal))
            fetched = future.result(timeout=25)
    except Exception as e:
        logger.warning(f"API resource fetch failed: {e}")
        fetched = []

    # Merge curated (highest quality) + fetched, deduplicate
    curated = get_curated(goal, node_title)
    seen_urls: set = set()
    merged = []
    for r in curated + fetched:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            merged.append({"label": r.get("label", url), "url": url, "tag": r.get("tag", "")})

    logger.info(f"Resources for '{node_title}': {len(curated)} curated + {len(fetched)} fetched = {len(merged)} total")
    return merged[:resource_count + 2]
