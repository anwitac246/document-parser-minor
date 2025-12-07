# Legal Flow

Legal Flow is a comprehensive web application designed to help users navigate legal documentation with ease. Upload legal forms, MOUs, court documents, and other legal materials to receive intelligent assistance with form completion, jargon clarification, and risk assessment through an AI-powered chatbot with voice-to-voice capabilities.

## Features

- Secure document upload and processing for legal forms and documents
- AI-powered chatbot with voice mode for interactive assistance
- OCR capabilities for extracting text from scanned documents
- Real-time community chat for user collaboration
- Personalized government scheme recommendations based on user needs
- Form filling guidance and legal jargon explanations
- Risk factor assessment for legal documents

## Tech Stack

**Frontend:**
- Next.js
- TypeScript
- Tailwind CSS

**Backend:**
- FastAPI
- Python

**APIs and Services:**
- ElevenLabs AI for voice synthesis
- Google Vision API for OCR
- WebSockets for real-time chat functionality

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)
- npm or yarn

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/legal-flow.git
cd legal-flow
```

### Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

Create a `.env.local` file in the frontend directory with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the backend directory with your API keys:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
DATABASE_URL=your_database_url
SECRET_KEY=your_secret_key
```

## Running the Application

### Start the Backend Server

From the backend directory:

```bash
uvicorn main:app --reload
```

The backend API will be available at `http://localhost:8000`

### Start the Frontend Development Server

From the frontend directory:

```bash
npm run dev
```

The frontend application will be available at `http://localhost:3000`

## Project Structure

```
legal-flow/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env
└── README.md
```

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation powered by FastAPI's automatic OpenAPI generation.

## Contributing

We welcome contributions to Legal Flow. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing to ensure a positive and inclusive environment for all contributors.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

For questions, issues, or feature requests, please open an issue on our GitHub repository.

## Acknowledgments

- ElevenLabs AI for voice synthesis capabilities
- Google Cloud Vision for OCR functionality
- The open-source community for the frameworks and tools that made this project possible