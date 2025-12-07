import json
import re
from groq import Groq
from config.settings import settings

class GroqService:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = settings.GROQ_MODEL
    
    def generate_response(self, prompt: str, temperature: float = 0.3) -> str:
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=8000
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"GROQ API error: {str(e)}")
    
    def analyze_document_voice(self, text: str, user_query: str) -> dict:
        """
        Analyze document for voice interface - returns conversational response
        """
        print(f"Voice query: {user_query}")
        
        prompt = f"""You are a friendly legal assistant having a natural conversation. 
A user has uploaded a document and asked: "{user_query}"

DOCUMENT TEXT:
{text[:15000]}

Provide a warm, conversational response as if you're speaking to them in person. 

Guidelines:
- Speak naturally like a human, not like a robot
- Use simple, everyday language (no legal jargon unless necessary)
- Break down complex ideas into easy-to-understand explanations
- Be warm and reassuring
- Keep it concise but thorough (aim for 2-3 paragraphs)
- If there are risks, explain them clearly but don't be alarmist
- Use phrases like "So basically...", "What this means is...", "Here's the thing..."
- NO bullet points, NO numbered lists, NO formatting
- Write in flowing paragraphs as if speaking

Return a JSON object with:
{{
    "conversational_response": "your natural, spoken response here",
    "key_points": ["important point 1", "important point 2"],
    "risk_level": "low/medium/high"
}}
"""
        
        response = self.generate_response(prompt, temperature=0.7)
        parsed = self._parse_json_response(response)
        
        # Fallback if parsing fails
        if not parsed.get("conversational_response"):
            parsed["conversational_response"] = "I've reviewed the document. Let me explain what I found in simple terms. " + response[:500]
        
        return parsed
    
    def _is_form_filling_query(self, query: str, document_text: str) -> bool:
        """Detect if user is asking about form filling"""
        if not query:
            return False
        
        query_lower = query.lower()
        
        form_keywords = [
            'fill', 'form', 'complete', 'submit', 'enter', 
            'how to', 'guide', 'instructions', 'steps',
            'filling', 'completing', 'application'
        ]
        
        has_form_keyword = any(keyword in query_lower for keyword in form_keywords)
        
        form_indicators = ['form', 'application', 'please provide', 'enter your', 'fill in', 'required information']
        is_likely_form = any(indicator in document_text.lower()[:2000] for indicator in form_indicators)
        
        return has_form_keyword or (is_likely_form and ('how' in query_lower or 'what' in query_lower))
    
    def analyze_document(self, text: str, user_query: str = None) -> dict:
        """Main document analysis with form filling support"""
        
        is_form_query = self._is_form_filling_query(user_query or "", text)
        
        print(f"User query: {user_query}")
        print(f"Is form query: {is_form_query}")
        
        base_instructions = """
You are a legal document analyzer. Analyze this document and provide:

1. Potentially problematic clauses (fishy clauses)
2. Legal jargon that needs explanation
3. Risk assessment for each clause

CRITICAL FORMATTING RULES:
- NO emojis anywhere
- NO bullet points (-, *, •) in any text fields
- Use plain text with proper punctuation
- Write in complete sentences
- Keep explanations clear and concise
"""

        if is_form_query:
            base_instructions += """

USER WANTS TO KNOW HOW TO FILL THIS FORM.

You MUST provide a comprehensive form filling guide that includes:

1. PURPOSE: Explain what this form is for and why it's needed
2. STEP-BY-STEP GUIDE: For each field/section in the form:
   - Field name or section title
   - What information is required
   - A realistic mock/example value
   - Any important tips or warnings
3. JARGON EXPLANATIONS: Define all legal terms used in the form
4. RISK WARNINGS: Highlight any medium or high-risk clauses that the user should be careful about when filling the form
5. GENERAL TIPS: Best practices for completing this form safely

Example structure for steps:
Step 1: Full Legal Name
- What to enter: Your complete name as it appears on government ID
- Example value: John Michael Smith
- Important tip: Must match exactly with your identification documents

Focus on being practical and helpful. The user needs to know HOW to complete this form, not just what's problematic about it.
"""
            
        elif user_query:
            base_instructions += f"""

USER QUESTION: {user_query}

Answer this specific question clearly and directly using information from the document.
"""

        if user_query and not is_form_query:
            answer_part = '"direct answer to user query"'
        else:
            answer_part = 'null'
        
        if is_form_query:
            form_guide_template = '{"purpose": "explain what this form is for", "steps": [{"step_number": 1, "field_name": "field name", "description": "what to enter", "example_value": "realistic example", "tips": "important notes"}], "warnings": ["warning about risky clauses"], "general_tips": ["best practice 1", "best practice 2"]}'
        else:
            form_guide_template = 'null'
        
        prompt = f"""{base_instructions}

DOCUMENT TEXT:
{text[:15000]}

Return ONLY a valid JSON object with this exact structure:
{{
    "fishy_clauses": [
        {{
            "clause_text": "exact text from document",
            "issue": "what makes this problematic (plain text)",
            "risk_level": "low/medium/high",
            "explanation": "detailed explanation",
            "recommendation": "what user should do"
        }}
    ],
    "jargon_terms": [
        {{
            "term": "legal term",
            "context": "how used in document",
            "definition": "simple explanation"
        }}
    ],
    "overall_risk": "low/medium/high",
    "summary": "brief document summary",
    "answer_to_user_query": {answer_part},
    "form_filling_guide": {form_guide_template}
}}

IMPORTANT: Ensure the JSON is valid and complete. Do not truncate any fields.
"""

        response = self.generate_response(prompt, temperature=0.2)
        parsed = self._parse_json_response(response)
        
        if is_form_query and not parsed.get("form_filling_guide"):
            print("WARNING: Form guide not generated by AI, creating fallback")
            parsed["form_filling_guide"] = {
                "purpose": "This appears to be a form that requires information to be filled out.",
                "steps": [
                    {
                        "step_number": 1,
                        "field_name": "Review Document",
                        "description": "Read through the entire form carefully",
                        "example_value": "N/A",
                        "tips": "Make sure you understand all sections before filling"
                    }
                ],
                "warnings": ["Please review all medium and high-risk clauses identified above before submitting"],
                "general_tips": [
                    "Read all instructions carefully",
                    "Keep copies of what you submit",
                    "Consult a legal professional if unsure"
                ]
            }
        
        return parsed
    
    def chat_response(self, message: str, context: list = None) -> str:
        """Handle chat conversations"""
        if context:
            messages = [{"role": msg["role"], "content": msg["content"]} for msg in context[-5:]]
            messages.append({"role": "user", "content": message})
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=4000
            )
            return response.choices[0].message.content
        else:
            return self.generate_response(message, temperature=0.7)
    
    def _parse_json_response(self, response: str) -> dict:
        """Parse JSON response and remove any markdown formatting"""
        cleaned = response.strip()
        
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        if cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        
        cleaned = cleaned.strip()
        
        try:
            parsed = json.loads(cleaned)
            return self._remove_emojis(parsed)
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Attempted to parse: {cleaned[:500]}")
            return {
                "fishy_clauses": [],
                "jargon_terms": [],
                "overall_risk": "unknown",
                "summary": "Failed to parse analysis. Please try again.",
                "error": f"JSON parsing error: {str(e)}"
            }
    
    def _remove_emojis(self, obj):
        """Recursively remove emojis from all strings in the JSON object"""
        if isinstance(obj, dict):
            return {k: self._remove_emojis(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._remove_emojis(item) for item in obj]
        elif isinstance(obj, str):
            emoji_pattern = re.compile("["
                u"\U0001F600-\U0001F64F"
                u"\U0001F300-\U0001F5FF"
                u"\U0001F680-\U0001F6FF"
                u"\U0001F1E0-\U0001F1FF"
                u"\U00002702-\U000027B0"
                u"\U000024C2-\U0001F251"
                u"\u26A0-\u26FF"
                u"\u2B50"
                u"\u2705"
                u"\u274C"
                "]+", flags=re.UNICODE)
            return emoji_pattern.sub('', obj)
        return obj

groq_service = GroqService()