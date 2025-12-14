from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import re
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from groq import Groq
from typing import Optional, List, Dict
from dotenv import load_dotenv
import os
from fastapi import APIRouter

load_dotenv()
router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in environment variables")


# Global variables for schemes data and models
normalized_schemes = []
model = None
faiss_index = None
dimension = None
conversation_sessions = {}

# Helper functions for extraction
def extract_age_range(text):
    text_lower = text.lower()
    min_age = None
    max_age = None
    age_pattern = r'(\d+)\s*(?:to|-)\s*(\d+)\s*years?'
    match = re.search(age_pattern, text_lower)
    if match:
        min_age = int(match.group(1))
        max_age = int(match.group(2))
    else:
        below_pattern = r'below\s*(\d+)\s*years?'
        match = re.search(below_pattern, text_lower)
        if match:
            max_age = int(match.group(1))
        above_pattern = r'above\s*(\d+)\s*years?'
        match = re.search(above_pattern, text_lower)
        if match:
            min_age = int(match.group(1))
    return min_age, max_age

def extract_gender(text):
    text_lower = text.lower()
    if 'female' in text_lower or 'women' in text_lower or 'girl' in text_lower:
        return 'female'
    elif 'male' in text_lower and 'female' not in text_lower:
        return 'male'
    return 'any'

def extract_income(text):
    text_lower = text.lower()
    income_pattern = r'(?:income|earning).*?(?:below|less than|up to|maximum).*?(?:rs\.?|inr|₹)?\s*(\d+(?:,\d+)*)'
    match = re.search(income_pattern, text_lower)
    if match:
        income_str = match.group(1).replace(',', '')
        return int(income_str)
    bpl_pattern = r'\b(?:bpl|below poverty line)\b'
    if re.search(bpl_pattern, text_lower):
        return 100000
    return None

def extract_caste(text):
    text_lower = text.lower()
    castes = []
    if re.search(r'\b(?:sc|scheduled caste)\b', text_lower):
        castes.append('SC')
    if re.search(r'\b(?:st|scheduled tribe)\b', text_lower):
        castes.append('ST')
    if re.search(r'\b(?:obc|other backward class)\b', text_lower):
        castes.append('OBC')
    if re.search(r'\b(?:general|unreserved)\b', text_lower):
        castes.append('General')
    return castes if castes else ['Any']

def extract_occupation(text):
    text_lower = text.lower()
    occupations = []
    if 'farmer' in text_lower or 'agriculture' in text_lower:
        occupations.append('farmer')
    if 'student' in text_lower or 'education' in text_lower:
        occupations.append('student')
    if 'unemployed' in text_lower:
        occupations.append('unemployed')
    if 'worker' in text_lower or 'labour' in text_lower or 'labor' in text_lower:
        occupations.append('worker')
    return occupations if occupations else ['any']

def extract_residence(text):
    text_lower = text.lower()
    if 'rural' in text_lower and 'urban' not in text_lower:
        return 'rural'
    elif 'urban' in text_lower and 'rural' not in text_lower:
        return 'urban'
    return 'any'

def extract_state(text):
    text_lower = text.lower()
    states = ['andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi']
    for state in states:
        if state in text_lower:
            return state.title()
    return None

def extract_benefit_type(text):
    text_lower = text.lower()
    if 'scholarship' in text_lower or 'education' in text_lower:
        return 'scholarship'
    elif 'pension' in text_lower:
        return 'pension'
    elif 'loan' in text_lower or 'credit' in text_lower:
        return 'loan'
    elif 'subsidy' in text_lower:
        return 'subsidy'
    elif 'insurance' in text_lower:
        return 'insurance'
    else:
        return 'financial_assistance'

def extract_benefit_amount(text):
    text_lower = text.lower()
    amount_pattern = r'(?:rs\.?|inr|₹)\s*(\d+(?:,\d+)*)'
    match = re.search(amount_pattern, text_lower)
    if match:
        amount_str = match.group(1).replace(',', '')
        return int(amount_str)
    return None

def extract_category(text):
    text_lower = text.lower()
    if 'education' in text_lower or 'student' in text_lower or 'scholarship' in text_lower:
        return 'education'
    elif 'health' in text_lower or 'medical' in text_lower:
        return 'health'
    elif 'agriculture' in text_lower or 'farmer' in text_lower:
        return 'agriculture'
    elif 'employment' in text_lower or 'skill' in text_lower:
        return 'employment'
    elif 'pension' in text_lower or 'senior' in text_lower or 'elderly' in text_lower:
        return 'social_security'
    elif 'women' in text_lower or 'girl' in text_lower:
        return 'women_empowerment'
    else:
        return 'general_welfare'

def extract_target_groups(text):
    text_lower = text.lower()
    groups = []
    if 'women' in text_lower or 'girl' in text_lower:
        groups.append('women')
    if 'student' in text_lower or 'education' in text_lower:
        groups.append('students')
    if 'farmer' in text_lower:
        groups.append('farmers')
    if 'senior' in text_lower or 'elderly' in text_lower or 'aged' in text_lower:
        groups.append('senior_citizens')
    if 'child' in text_lower:
        groups.append('children')
    if 'disabled' in text_lower or 'handicapped' in text_lower:
        groups.append('disabled')
    if 'widow' in text_lower:
        groups.append('widows')
    if 'minority' in text_lower:
        groups.append('minorities')
    return groups if groups else ['general']

def determine_level(text):
    text_lower = text.lower()
    states = ['andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi']
    for state in states:
        if state in text_lower:
            return 'state'
    return 'central'

def load_schemes_data():
    """Load and normalize schemes data"""
    global normalized_schemes, model, faiss_index, dimension
    
    print("\n" + "="*60)
    print("Loading Government Schemes Database")
    print("="*60)
    
    try:
        # Try to load schemes data - check multiple possible paths
        scheme_file = None
        possible_paths = [
            'myscheme_raw.json',
            'backend/myscheme_raw.json',
            '../myscheme_raw.json',
            'data/myscheme_raw.json',
            os.path.join(os.path.dirname(__file__), '..', '..', 'myscheme_raw.json'),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                scheme_file = path
                print(f"✓ Found scheme data at: {path}")
                break
        
        if not scheme_file:
            print("✗ ERROR: myscheme_raw.json not found!")
            print(f"  Searched in: {', '.join(possible_paths)}")
            return
            
        with open(scheme_file, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
            
    except json.JSONDecodeError:
        print("⚠ JSON decode error, attempting to clean and parse...")
        with open(scheme_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            content = content.replace('\n', ' ').replace('\r', ' ')
            content = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', content)
            try:
                raw_data = json.loads(content)
            except:
                lines = content.split('},')
                raw_data = []
                for i, line in enumerate(lines):
                    if not line.strip():
                        continue
                    if not line.strip().endswith('}'):
                        line = line + '}'
                    if not line.strip().startswith('{'):
                        line = '{' + line
                    try:
                        obj = json.loads(line)
                        raw_data.append(obj)
                    except:
                        pass

    print(f"✓ Loaded {len(raw_data)} raw schemes")
    print("Processing and normalizing schemes...")
    
    # Normalize schemes
    for idx, scheme in enumerate(raw_data):
        try:
            combined_text = ' '.join([str(scheme.get(k, '')) for k in scheme.keys()])
            min_age, max_age = extract_age_range(combined_text)
            gender = extract_gender(combined_text)
            max_income = extract_income(combined_text)
            caste = extract_caste(combined_text)
            occupation = extract_occupation(combined_text)
            residence = extract_residence(combined_text)
            state_specific = extract_state(combined_text)
            benefit_type = extract_benefit_type(combined_text)
            benefit_amount = extract_benefit_amount(combined_text)
            category = extract_category(combined_text)
            target_groups = extract_target_groups(combined_text)
            level = determine_level(combined_text)
            state_field = state_specific if state_specific else 'All'
            
            semantic_summary = f"{scheme.get('schemeName', '')}. {scheme.get('Details', '')} {scheme.get('Benefits', '')}"
            
            tags = []
            tags.extend(target_groups)
            tags.append(category)
            tags.extend(caste if caste != ['Any'] else [])
            tags.extend(occupation if occupation != ['any'] else [])
            
            normalized_scheme = {
                'scheme_id': f'scheme_{idx+1}',
                'name': scheme.get('schemeName', ''),
                'level': level,
                'state': state_field,
                'category': category,
                'target_groups': target_groups,
                'eligibility': {
                    'min_age': min_age,
                    'max_age': max_age,
                    'gender': gender,
                    'max_family_income': max_income,
                    'caste': caste,
                    'occupation': occupation,
                    'residence': residence,
                    'state_specific': state_specific
                },
                'benefits': {
                    'type': benefit_type,
                    'amount': benefit_amount,
                    'description': scheme.get('Benefits', '')
                },
                'details': scheme.get('Details', ''),
                'application_process': scheme.get('How to Avail', ''),
                'tags': list(set(tags)),
                'semantic_summary': semantic_summary,
                'full_text': combined_text
            }
            normalized_schemes.append(normalized_scheme)
        except Exception as e:
            print(f"  ⚠ Error processing scheme {idx}: {e}")
            pass

    print(f"✓ Normalized {len(normalized_schemes)} schemes")

    # Load model and create FAISS index
    print("Loading AI model (this may take a moment)...")
    try:
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✓ Sentence transformer model loaded")
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return
    
    print("Creating FAISS semantic search index...")
    try:
        all_scheme_summaries = [s['semantic_summary'] for s in normalized_schemes]
        print(f"  Encoding {len(all_scheme_summaries)} schemes (this may take 1-2 minutes)...")
        
        # Encode in batches with progress
        batch_size = 100
        all_embeddings = []
        for i in range(0, len(all_scheme_summaries), batch_size):
            batch = all_scheme_summaries[i:i+batch_size]
            batch_embeddings = model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
            all_embeddings.append(batch_embeddings)
            print(f"  Progress: {min(i+batch_size, len(all_scheme_summaries))}/{len(all_scheme_summaries)} schemes encoded")
        
        all_scheme_embeddings = np.vstack(all_embeddings)
        print(f"✓ All schemes encoded into vectors")
        
        dimension = all_scheme_embeddings.shape[1]
        print(f"  Creating FAISS index with dimension {dimension}...")
        faiss_index = faiss.IndexFlatL2(dimension)
        faiss_index.add(all_scheme_embeddings.astype('float32'))
        print(f"✓ FAISS index created with {len(normalized_schemes)} schemes")
    except Exception as e:
        print(f"✗ Error creating FAISS index: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("="*60)
    print("✓ Scheme Recommender System Ready!")
    print("="*60 + "\n")

# Pydantic models
class UserProfile(BaseModel):
    age: int
    gender: str
    family_income: int
    caste: str
    occupation: str
    residence: str
    state: str
    interests: str

class ChatMessage(BaseModel):
    message: str
    user_id: str
    context: Optional[List[Dict]] = None
    user_profile: Optional[Dict] = None

def check_eligibility(scheme, user):
    """Check if user is eligible for a scheme"""
    elig = scheme['eligibility']
    
    if elig['min_age'] is not None and user['age'] < elig['min_age']:
        return False
    if elig['max_age'] is not None and user['age'] > elig['max_age']:
        return False
    
    if elig['gender'] != 'any' and user['gender'] != elig['gender']:
        return False
    
    if elig['max_family_income'] is not None and user['family_income'] > elig['max_family_income']:
        return False
    
    if 'Any' not in elig['caste'] and user['caste'] not in elig['caste']:
        return False
    
    if 'any' not in elig['occupation'] and user['occupation'] not in elig['occupation']:
        return False
    
    if elig['residence'] != 'any' and user['residence'] != elig['residence']:
        return False
    
    if elig['state_specific'] is not None and user['state'] != elig['state_specific']:
        return False
    
    return True

def retrieve_relevant_schemes(query: str, user_profile: Dict = None, k: int = 5):
    """Use FAISS to retrieve relevant schemes based on query"""
    if not model or not faiss_index:
        raise HTTPException(status_code=500, detail="Scheme data not loaded. Please restart the server.")
    
    query_embedding = model.encode([query], convert_to_numpy=True)
    distances, indices = faiss_index.search(query_embedding.astype('float32'), k * 2)
    
    retrieved_schemes = [normalized_schemes[i] for i in indices[0]]
    
    # Filter by user profile if provided
    if user_profile:
        eligible = [s for s in retrieved_schemes if check_eligibility(s, user_profile)]
        if eligible:
            return eligible[:k]
    
    return retrieved_schemes[:k]

def format_scheme_for_context(scheme):
    """Format scheme data for LLM context"""
    context = f"""
Scheme: {scheme['name']}
Category: {scheme['category']}
Level: {scheme['level']}
State: {scheme['state']}
Benefits: {scheme['benefits']['description']}
"""
    if scheme['benefits']['amount']:
        context += f"Amount: ₹{scheme['benefits']['amount']:,}\n"
    
    context += f"Details: {scheme['details']}\n"
    
    if scheme.get('application_process'):
        context += f"How to Apply: {scheme['application_process']}\n"
    
    elig = scheme['eligibility']
    context += "\nEligibility:\n"
    if elig['min_age'] or elig['max_age']:
        age_str = ""
        if elig['min_age']:
            age_str += f"Min age: {elig['min_age']}"
        if elig['max_age']:
            age_str += f", Max age: {elig['max_age']}"
        context += f"- Age: {age_str}\n"
    if elig['gender'] != 'any':
        context += f"- Gender: {elig['gender']}\n"
    if elig['max_family_income']:
        context += f"- Max income: ₹{elig['max_family_income']:,}\n"
    if 'Any' not in elig['caste']:
        context += f"- Caste: {', '.join(elig['caste'])}\n"
    
    return context

# API Routes
@router.post("/chat")
async def scheme_chat(chat_msg: ChatMessage):
    """Chat endpoint for conversational scheme queries"""
    try:
        if not GROQ_API_KEY:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
        if not normalized_schemes:
            raise HTTPException(status_code=500, detail="Scheme data not loaded. Please check server logs.")
        
        user_id = chat_msg.user_id
        message = chat_msg.message
        user_profile = chat_msg.user_profile
        context_history = chat_msg.context or []
        
        # Initialize session if needed
        if user_id not in conversation_sessions:
            conversation_sessions[user_id] = {
                'profile': user_profile,
                'eligible_schemes': [],
                'history': []
            }
        
        # Update profile if provided
        if user_profile:
            conversation_sessions[user_id]['profile'] = user_profile
            # Get eligible schemes
            eligible = [s for s in normalized_schemes if check_eligibility(s, user_profile)]
            conversation_sessions[user_id]['eligible_schemes'] = eligible
        
        # Retrieve relevant schemes using RAG
        session = conversation_sessions[user_id]
        relevant_schemes = retrieve_relevant_schemes(
            message, 
            session.get('profile'),
            k=5
        )
        
        # Build context for LLM
        schemes_context = "\n\n".join([format_scheme_for_context(s) for s in relevant_schemes])
        
        # Build conversation history
        history_text = ""
        if context_history:
            for msg in context_history[-5:]:  # Last 5 messages
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                history_text += f"{role.capitalize()}: {content}\n"
        
        # Create prompt
        system_prompt = """You are a helpful government schemes advisor chatbot for India. You help users find and understand government schemes they're eligible for.

Your role:
1. Answer questions about specific schemes
2. Help users understand eligibility criteria
3. Explain application processes
4. Compare different schemes
5. Provide clarifications on benefits and requirements

Always be friendly, clear, and helpful. Use the scheme information provided to give accurate answers."""

        user_prompt = f"""Based on the following relevant government schemes and user query, provide a helpful response.

User Profile:
{f"Age: {session['profile']['age']}, Gender: {session['profile']['gender']}, Income: ₹{session['profile']['family_income']}, Occupation: {session['profile']['occupation']}, State: {session['profile']['state']}" if session.get('profile') else "Not provided yet"}

Conversation History:
{history_text if history_text else "This is the start of the conversation"}

Relevant Schemes:
{schemes_context}

User Question: {message}

Provide a conversational, helpful response. If recommending schemes, format them nicely with markdown. If the user asks about application process, eligibility, or specific details, provide that information from the schemes data above."""

        # Call Groq API
        client = Groq(api_key=GROQ_API_KEY)
        
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2000
        )
        
        response_text = chat_completion.choices[0].message.content
        
        # Store in session history
        session['history'].append({
            'user': message,
            'assistant': response_text,
            'schemes_used': [s['name'] for s in relevant_schemes]
        })
        
        return {
            "response": response_text,
            "relevant_schemes": [s['name'] for s in relevant_schemes],
            "eligible_count": len(session.get('eligible_schemes', []))
        }
        
    except Exception as e:
        print(f"Error in scheme_chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend")
async def recommend_schemes(user_profile: UserProfile):
    """Initial scheme recommendation based on user profile"""
    try:
        if not normalized_schemes:
            raise HTTPException(status_code=500, detail="Scheme data not loaded. Please check server logs.")
        
        user_dict = user_profile.dict()
        
        # Filter eligible schemes
        eligible_schemes = [s for s in normalized_schemes if check_eligibility(s, user_dict)]
        
        if len(eligible_schemes) == 0:
            return {
                "response": "Unfortunately, no schemes match your eligibility criteria. You can still ask me questions about government schemes!",
                "count": 0
            }
        
        # Get top schemes using semantic search
        query = f"{user_dict['interests']} for {user_dict['gender']} {user_dict['occupation']} age {user_dict['age']}"
        query_embedding = model.encode([query], convert_to_numpy=True)
        
        # Create temporary index for eligible schemes
        eligible_summaries = [s['semantic_summary'] for s in eligible_schemes]
        eligible_embeddings = model.encode(eligible_summaries, convert_to_numpy=True)
        
        temp_index = faiss.IndexFlatL2(dimension)
        temp_index.add(eligible_embeddings.astype('float32'))
        
        k = min(8, len(eligible_schemes))
        distances, indices = temp_index.search(query_embedding.astype('float32'), k)
        
        top_schemes = [eligible_schemes[i] for i in indices[0]]
        
        # Format as markdown
        markdown = "# Your Personalized Government Schemes\n\n"
        markdown += f"Based on your profile, I found **{len(eligible_schemes)} schemes** you're eligible for. Here are the top recommendations:\n\n---\n\n"
        
        for i, scheme in enumerate(top_schemes, 1):
            markdown += f"## {i}. {scheme['name']}\n\n"
            markdown += f"**Category:** {scheme['category'].replace('_', ' ').title()} | "
            markdown += f"**Level:** {scheme['level'].title()}\n\n"
            
            if scheme['benefits']['description']:
                markdown += f"**Benefits:** {scheme['benefits']['description']}\n\n"
            
            if scheme['benefits']['amount']:
                markdown += f"** Amount:** ₹{scheme['benefits']['amount']:,}\n\n"
            
            markdown += "---\n\n"
        
        markdown += "\n**Have questions?** Feel free to ask me about:\n"
        markdown += "- Specific scheme details\n"
        markdown += "- How to apply\n"
        markdown += "- Eligibility criteria\n"
        markdown += "- Document requirements\n"
        markdown += "- Comparison between schemes\n"
        
        return {
            "response": markdown,
            "count": len(eligible_schemes),
            "top_schemes": [s['name'] for s in top_schemes]
        }
        
    except Exception as e:
        print(f"Error in recommend_schemes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def status():
    """Get status of scheme recommender"""
    return {
        "schemes_loaded": len(normalized_schemes),
        "model_loaded": model is not None,
        "faiss_index_ready": faiss_index is not None,
        "active_sessions": len(conversation_sessions),
        "groq_configured": bool(GROQ_API_KEY)
    }

# Load data on module import
try:
    load_schemes_data()
except Exception as e:
    print(f"✗ Error loading schemes data: {e}")
    print("  Scheme recommender will not be available until data is loaded")
    print("  Please ensure myscheme_raw.json is in the correct location")