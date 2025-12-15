import json
import requests
import os
import time

# --- Constants ---
# Use the filtered file as the input for this script
SCHEMES_RAW_FILE = 'schemes_raw_filtered.json'
OUTPUT_FILE = 'combined_scheme_data.json'
REQUEST_DELAY = 0.2  # Delay in seconds between each request to avoid rate limiting
HEADERS = {
    'accept': 'application/json, text/plain, */*',
    'accept-language': 'en-US,en;q=0.9,en-IN;q=0.8',
    'origin': 'https://www.myscheme.gov.in',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Microsoft Edge";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
    'x-api-key': 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc'
}
BASE_URL = 'https://api.myscheme.gov.in/schemes/v5/public/schemes/{}/documents?lang=en'

# --- Helper Functions ---
def create_id_to_scheme_map(schemes_raw_data):
    """
    Creates a dictionary mapping unique scheme IDs to their full data objects.
    This is more robust than iterating over keys directly.
    """
    id_map = {}
    if not isinstance(schemes_raw_data, dict):
        return id_map
    for value in schemes_raw_data.values():
        if value is None or not isinstance(value, dict):
            continue
        scheme_id = value.get('data', {}).get('_id')
        if scheme_id:
            id_map[scheme_id] = value
    return id_map

def fetch_document_data(scheme_id):
    """
    Fetches the documents required data for a given scheme ID from the API.
    """
    url = BASE_URL.format(scheme_id)
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        
        # Check if the response body is not empty before parsing as JSON
        if response.content:
            doc_data = response.json()
            
            # --- START: MODIFIED SECTION ---
            # Safely navigate the nested dictionary to prevent the AttributeError
            data_dict = doc_data.get('data')
            if not data_dict:
                return ""
            
            en_dict = data_dict.get('en')
            if not en_dict:
                return ""
            
            return en_dict.get('documentsRequired_md', '')
            # --- END: MODIFIED SECTION ---

        else:
            print(f"Warning: Empty response body for scheme ID: {scheme_id}")
            return ""
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching documents for ID '{scheme_id}': {e}")
        return ""
    # Added JSONDecodeError to handle cases where response is not valid JSON
    except json.JSONDecodeError:
        print(f"Warning: Failed to decode JSON for scheme ID: {scheme_id}")
        return ""

# --- Main Script ---
def process_and_combine_data():
    """
    Reads scheme data from the filtered file, fetches document data for each unique scheme,
    and saves the combined data to a new JSON file.
    """
    try:
        with open(SCHEMES_RAW_FILE, 'r') as f:
            schemes_raw_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading {SCHEMES_RAW_FILE}: {e}")
        return

    id_to_scheme_map = create_id_to_scheme_map(schemes_raw_data)
    
    unique_scheme_ids = list(id_to_scheme_map.keys())
    if not unique_scheme_ids:
        print("No unique scheme IDs found to process.")
        return

    all_combined_data = []
    total_ids = len(unique_scheme_ids)
    
    print(f"Found {total_ids} unique scheme IDs. Fetching data...")
    
    for i, scheme_id in enumerate(unique_scheme_ids):
        scheme_info = id_to_scheme_map.get(scheme_id)
        
        # This check prevents the AttributeError if the entry somehow becomes None
        if not scheme_info:
            print(f"Skipping ID '{scheme_id}': No valid scheme data found.")
            continue
        
        # Fetch the documents data from the API
        documents_required = fetch_document_data(scheme_id)

        # Extract other fields from the raw scheme data
        scheme_en = scheme_info.get('data', {}).get('en', {})
        scheme_content = scheme_en.get('schemeContent', {})
        application_process = scheme_en.get('applicationProcess', [])
        eligibility_criteria = scheme_en.get('eligibilityCriteria', {})
        
        # Combine "Detailed Description" and "Brief Description"
        details = f"{scheme_content.get('detailedDescription_md', '').strip()}\n{scheme_content.get('briefDescription', '').strip()}"

        # Extract Application Process
        app_process_list = []
        for ap_item in application_process:
            app_process_list.append({
                "mode": ap_item.get("mode"),
                "process": ap_item.get("process_md")
            })

        # Create the new structured dictionary
        new_entry = {
            "schemeName": scheme_en.get('basicDetails', {}).get('schemeName'),
            "Details": details.strip(),
            "Benefits": scheme_content.get('benefits_md'),
            "Eligibility": eligibility_criteria.get('eligibilityDescription_md'),
            "Application Process": app_process_list,
            "Documents Required": documents_required
        }
        all_combined_data.append(new_entry)
        
        print(f"[{i + 1}/{total_ids}] Processed scheme: {new_entry['schemeName']}")
        
        time.sleep(REQUEST_DELAY)

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(all_combined_data, f, indent=4)
    
    print(f"\nSuccessfully processed and saved data for {len(all_combined_data)} unique schemes to '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    process_and_combine_data()