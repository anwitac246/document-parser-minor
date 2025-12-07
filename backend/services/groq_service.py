import json
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
    
    def analyze_document(self, text: str, user_query: str = None) -> dict:
    # Build the prompt dynamically depending on whether a user query exists.
        base_instructions = """
Analyze this legal document and identify:
1. Potentially problematic clauses (fishy clauses)
2. Legal jargon that needs explanation
3. Risk assessment for each clause
4. Do not add any emojis.
"""

        if user_query:
            base_instructions += f"\nUser question:\n{user_query}\n\nAlso answer this question directly using the document."

            prompt = f"""{base_instructions}

        Document text:
        {text[:15000]}

        Return ONLY a JSON object with this structure:
        {{
        "fishy_clauses": [
            {{
            "clause_text": "exact text from document",
            "issue": "what makes this problematic",
            "risk_level": "low/medium/high",
            "explanation": "detailed explanation",
            "recommendation": "what user should do"
            }}
        ],
        "jargon_terms": [
            {{
            "term": "legal term found",
            "context": "how it's used in document",
            "definition": "simple explanation"
            }}
        ],
        "overall_risk": "low/medium/high",
        "summary": "brief document summary",
        "answer_to_user_query": "if user_query was provided, answer it here; otherwise return null"
        }}
        """

        response = self.generate_response(prompt, temperature=0.2)
        return self._parse_json_response(response)

    
    def chat_response(self, message: str, context: list = None) -> str:
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
        cleaned = response.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        if cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        
        try:
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {
                "fishy_clauses": [],
                "jargon_terms": [],
                "overall_risk": "unknown",
                "summary": "Failed to parse analysis",
                "error": "JSON parsing error"
            }

groq_service = GroqService()