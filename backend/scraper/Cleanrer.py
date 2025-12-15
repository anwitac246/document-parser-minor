import json

# --- Constants ---
# The file to be cleaned
INPUT_FILE = 'combined_scheme_data.json'
# The new file that will store the cleaned data
OUTPUT_FILE = 'cleaned_schemes_for_training.json'

def clean_and_save_data():
    """
    Reads scheme data, removes any object with empty or null fields,
    and saves the clean data to a new file for model training.
    """
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            all_schemes = json.load(f)
    except FileNotFoundError:
        print(f"Error: The input file '{INPUT_FILE}' was not found.")
        print("Please ensure the file is in the same directory as this script.")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from '{INPUT_FILE}'. It may be corrupted.")
        return

    original_count = len(all_schemes)
    cleaned_schemes = []

    print(f"Starting with {original_count} schemes. Beginning cleaning process...")

    # Iterate through each scheme and check its fields for validity
    for scheme in all_schemes:
        is_valid = True
        # Check every field in the current scheme object
        for key, value in scheme.items():
            # A field is considered "null" or "empty" if it's None, an empty string,
            # or an empty list.
            if (value is None or
               (isinstance(value, str) and not value.strip()) or
               (isinstance(value, list) and not value)):
                
                # If an invalid field is found, mark the whole object as invalid
                # and break the inner loop to move to the next scheme.
                is_valid = False
                break
        
        # If after checking all fields, the object is still valid, add it to our clean list.
        if is_valid:
            cleaned_schemes.append(scheme)

    cleaned_count = len(cleaned_schemes)
    removed_count = original_count - cleaned_count

    # Save the cleaned data to the new output file
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(cleaned_schemes, f, indent=4)
    except IOError as e:
        print(f"Error: Could not write to file '{OUTPUT_FILE}'. Reason: {e}")
        return

    # --- Print Summary Report ---
    print("\n--- Data Cleaning Complete ---")
    print(f"Original number of schemes: {original_count}")
    print(f"Schemes removed due to missing data: {removed_count}")
    print(f"Schemes remaining for training: {cleaned_count}")
    print(f"\n✅ Clean data has been successfully saved to '{OUTPUT_FILE}'")

if __name__ == "__main__":
    clean_and_save_data()