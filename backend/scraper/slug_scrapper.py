import requests
import json

url = "https://api.myscheme.gov.in/search/v5/schemes?lang=en&q=%5B%5D&keyword=&sort="

headers = {
    "accept": "application/json, text/plain, */*",
    "origin": "https://www.myscheme.gov.in",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
    "x-api-key": "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc"
}

slugs = []
size = 100
total = 3965

for start in range(0, total, size):
    params = {
        "from": start,
        "size": size
    }
    res = requests.get(url, headers=headers, params=params).json()
    items = res["data"]["hits"]["items"]
    slugs.extend([x["fields"]["slug"] for x in items])
    print(f"Fetched {len(slugs)} so far...")

# save all slugs into a JSON file
with open("slugs.json", "w") as f:
    json.dump(slugs, f, indent=2)

print("Total slugs collected:", len(slugs))
