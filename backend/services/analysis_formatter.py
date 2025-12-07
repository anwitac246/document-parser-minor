from typing import Dict, List
from config.settings import settings

class AnalysisFormatter:
    
    def format_analysis_as_markdown(self, analysis: dict, document_name: str = "Document") -> str:
        md = f"# Legal Document Analysis: {document_name}\n\n"
        
        if "error" in analysis:
            return f"{md}**Error:** {analysis['error']}\n\nPlease try uploading the document again."
        
        overall_risk = analysis.get("overall_risk", "unknown")
        summary = analysis.get("summary", "No summary available")
        
        md += f"## Overall Risk Assessment: **{overall_risk.upper()}**\n\n"
        md += f"### Summary\n{summary}\n\n"
        
        # Handle user query answer if present
        answer_to_query = analysis.get("answer_to_user_query")
        if answer_to_query:
            md += f"## Your Question Answered\n\n{answer_to_query}\n\n"
        
        # Handle form filling guide if present
        form_guide = analysis.get("form_filling_guide")
        if form_guide:
            md += self._format_form_filling_guide(form_guide)
        
        fishy_clauses = analysis.get("fishy_clauses", [])
        if fishy_clauses:
            md += "## Problematic Clauses Identified\n\n"
            
            for i, clause in enumerate(fishy_clauses, 1):
                risk_indicator = self._get_risk_indicator(clause.get("risk_level", "medium"))
                md += f"### {risk_indicator} Clause {i}: {clause.get('risk_level', 'medium').upper()} Risk\n\n"
                md += f"**Original Text:**\n> {clause.get('clause_text', 'N/A')}\n\n"
                md += f"**Issue:** {clause.get('issue', 'Not specified')}\n\n"
                md += f"**Explanation:** {clause.get('explanation', 'No explanation provided')}\n\n"
                md += f"**Recommendation:** {clause.get('recommendation', 'Consult with a legal professional')}\n\n"
                md += "---\n\n"
        else:
            md += "## No Major Issues Detected\n\nNo obviously problematic clauses were identified in this document.\n\n"
        
        jargon_terms = analysis.get("jargon_terms", [])
        if jargon_terms:
            md += "## Legal Terms Explained\n\n"
            md += "Hover over highlighted terms in the document to see their definitions.\n\n"
            
            for term in jargon_terms[:10]:
                term_name = term.get("term", "")
                definition = term.get("definition", "")
                context = term.get("context", "")
                
                md += f"**{term_name}**: {definition}"
                if context:
                    md += f"\n- *In this document:* {context}"
                md += "\n\n"
        
        md += "\n\n## General Recommendations\n\n"
        md += "- Review all highlighted clauses carefully\n"
        md += "- Consider consulting with a legal professional\n"
        md += "- Don't sign anything you don't fully understand\n"
        md += "- Ask for clarification on any unclear terms\n"
        
        return md
    
    def _format_form_filling_guide(self, form_guide: dict) -> str:
        """Format the form filling guide section"""
        md = "## HOW TO FILL THIS FORM\n\n"
        
        # Add purpose if available
        purpose = form_guide.get("purpose")
        if purpose:
            md += f"**Purpose:** {purpose}\n\n"
        
        # Add step-by-step instructions
        steps = form_guide.get("steps", [])
        if steps:
            md += "### Step-by-Step Instructions\n\n"
            for step in steps:
                step_num = step.get("step_number", "")
                field_name = step.get("field_name", "")
                description = step.get("description", "")
                example = step.get("example_value", "")
                tips = step.get("tips", "")
                
                md += f"**{step_num}. {field_name}**\n\n"
                md += f"What to enter: {description}\n\n"
                if example:
                    md += f"Example value: `{example}`\n\n"
                if tips:
                    md += f"**Important:** {tips}\n\n"
                md += "---\n\n"
        
        # Add general tips
        general_tips = form_guide.get("general_tips", [])
        if general_tips:
            md += "### General Tips for Completing This Form\n\n"
            for i, tip in enumerate(general_tips, 1):
                md += f"{i}. {tip}\n"
            md += "\n"
        
        # Add warnings about risky clauses
        warnings = form_guide.get("warnings", [])
        if warnings:
            md += "### CAUTION: Review These Risks\n\n"
            for i, warning in enumerate(warnings, 1):
                md += f"{i}. {warning}\n"
            md += "\n"
        
        md += "---\n\n"
        return md
    
    def _get_risk_indicator(self, risk_level: str) -> str:
        """Return text-based risk indicators instead of emojis"""
        risk_map = {
            "high": "[HIGH RISK]",
            "medium": "[MEDIUM RISK]",
            "low": "[LOW RISK]"
        }
        return risk_map.get(risk_level.lower(), "[RISK]")
    
    def extract_terms_for_highlighting(self, analysis: dict) -> dict:
        terms = {}
        
        for term_obj in analysis.get("jargon_terms", []):
            term = term_obj.get("term", "")
            if term:
                terms[term.lower()] = {
                    "definition": term_obj.get("definition", ""),
                    "context": term_obj.get("context", "")
                }
        
        for term, definition in settings.LEGAL_TERMS.items():
            if term.lower() not in terms:
                terms[term.lower()] = {
                    "definition": definition,
                    "context": "General legal term"
                }
        
        return terms

analysis_formatter = AnalysisFormatter()