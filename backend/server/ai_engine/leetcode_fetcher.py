import httpx
from typing import Dict, Any, Optional
from datetime import datetime

async def fetch_leetcode_stats(username: str) -> Optional[Dict[str, Any]]:
    """
    Fetches LeetCode stats using a public GraphQL endpoint.
    Returns a dict with solved count, easy/medium/hard, and streak if available.
    """
    url = "https://leetcode.com/graphql"
    query = """
    query userSessionProgress($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      userContestRanking(username: $username) {
        rating
        globalRanking
      }
    }
    """
    variables = {"username": username}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = client.post(url, json={"query": query, "variables": variables})
            resp.raise_for_status()
            data = resp.json()
            
            user = data.get("data", {}).get("matchedUser")
            if not user:
                return None
                
            stats = user.get("submitStats", {}).get("acSubmissionNum", [])
            
            result = {
                "username": username,
                "solved_total": 0,
                "easy": 0,
                "medium": 0,
                "hard": 0,
                "streak": 0, # LeetCode streak is harder to get via public GraphQL without auth, but we can mock or use a different query later.
                "timestamp": datetime.utcnow()
            }
            
            for item in stats:
                diff = item.get("difficulty")
                count = item.get("count")
                if diff == "All":
                    result["solved_total"] = count
                elif diff == "Easy":
                    result["easy"] = count
                elif diff == "Medium":
                    result["medium"] = count
                elif diff == "Hard":
                    result["hard"] = count
            
            return result
    except Exception as e:
        print(f"Error fetching LeetCode stats for {username}: {e}")
        return None
