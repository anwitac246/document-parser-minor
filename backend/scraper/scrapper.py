import requests
import json
import time

# Load slugs from file
with open("slugs.json") as f:
    slugs = json.load(f)

url = "https://api.myscheme.gov.in/schemes/v5/public/schemes"

headers = {
    "accept": "application/json, text/plain, */*",
    "origin": "https://www.myscheme.gov.in",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
    "x-api-key": "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc"
}

results = {}
for i, slug in enumerate(slugs, 1):
    params = {"slug": slug, "lang": "en"}
    res = requests.get(url, headers=headers, params=params).json()
    results[slug] = res
    print(f"[{i}/{len(slugs)}] Collected slug: {slug}")
    
    # Avoid hitting rate limits
    time.sleep(0.2)

# Save all raw scheme data
with open("schemes_raw.json", "w") as f:
    json.dump(results, f, indent=2)

print("Done! Saved all scheme details in schemes_raw.json")
