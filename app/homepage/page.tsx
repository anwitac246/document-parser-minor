'use client';

import { useState, useEffect } from 'react';
import Lottie from "lottie-react";
import { 
  FileText, 
  Building2, 
  Info, 
  Users, 
  Upload,
  ArrowRight,
  Github,
  Mail,
  Phone,
  Zap,
  ChevronRight,
  LucideIcon
} from 'lucide-react';

import Link from 'next/link';
import Navbar from '@/components/navbar';

// Import JSON files at the top
import chatbotPersonAnimation from '@/public/assets/chatbot_person.json';
import filesAnimation from '@/public/assets/Files.json';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface Stat {
  number: string;
  label: string;
}

interface Petal {
  title: string;
  points: string[];
}

interface VisibilityState {
  [key: string]: boolean;
}

export default function Homepage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<VisibilityState>({});

  // Intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll('.animate-on-scroll');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const features: Feature[] = [
    {
      icon: FileText,
      title: 'Document Parser',
      description: 'AI-powered document analysis that extracts key information from legal documents, contracts, and forms with precision and speed.',
    },
    {
      icon: Building2,
      title: 'Government Schemes',
      description: 'Comprehensive database of government schemes and programs. Find eligibility criteria and application processes tailored to your profile.',
    },
    {
      icon: Info,
      title: 'Legal Insights',
      description: 'Get detailed explanations of legal terms, requirements, and procedures. Simplifying complex legal language for everyone.',
    },
    {
      icon: Users,
      title: 'Secure Access',
      description: 'Enterprise-grade security for your sensitive legal documents. Role-based access and encrypted storage for peace of mind.',
    }
  ];

  const stats: Stat[] = [
    { number: '50K+', label: 'Documents Processed' },
    { number: '1000+', label: 'Government Schemes' },
    { number: '99.9%', label: 'Accuracy Rate' },
    { number: '24/7', label: 'Support Available' }
  ];

  const petals: Petal[] = [
    {
      title: "Understanding Documents",
      points: [
        "Upload any legal document",
        "Explain processes clearly",
        "Identify jargons/terms",
        "Show T&C links",
        "Highlight form fields",
      ],
    },
    {
      title: "Interactive & Visual",
      points: [
        "Graphical content explanation",
        "Show process flow",
        "Relevant YouTube videos",
        "Multilingual support",
        "Voice-over conversation",
      ],
    },
    {
      title: "AI-Powered Guidance",
      points: [
        "Personalized legal advice",
        "Context-aware suggestions",
        "Follow document type",
        "Step-by-step guidance",
        "Quick summaries",
      ],
    },
  ];

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode 
        ? 'bg-[#0B2E33] text-white' 
        : 'bg-white text-[#0B2E33]'
    }`}>
      <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-12 overflow-hidden z-50 bg-white">
        <div className="absolute top-0 left-0 w-32 h-32 z-10">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              fill="#1E8DD0"
              d="M60.9,-0.3C60.9,25.5,30.4,51,1.2,51C-27.9,51,-55.9,25.5,-55.9,-0.3C-55.9,-26.1,-27.9,-52.1,1.2,-52.1C30.4,-52.1,60.9,-26.1,60.9,-0.3Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        <div className="absolute top-8 left-0 w-52 h-52 z-0">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#BAE6FF"
              d="M61,-62.3C75.4,-46.6,81,-23.3,80.1,-0.9C79.3,21.6,72,43.1,57.6,59.7C43.1,76.4,21.6,88,2.2,85.9C-17.3,83.7,-34.5,67.7,-49.9,51.1C-65.3,34.5,-78.9,17.3,-77.7,1.2C-76.5,-14.9,-60.6,-29.7,-45.2,-45.5C-29.7,-61.3,-14.9,-77.9,4.2,-82.1C23.3,-86.3,46.6,-78.1,61,-62.3Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-6 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-5 items-center">
            
            {/* Left Content */}
            <div className="text-center pl-18 md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className={darkMode ? 'text-[#CADDE9]' : 'text-[#1E8DD0]'}>Legal</span>
                <span className={darkMode ? 'text-white' : 'text-[#0B2E33]'}>Flow</span>
              </h1>
              <p
                className={`text-xl md:text-2xl mb-8 leading-relaxed font-sans ${
                  darkMode ? 'text-[#CADDE9]' : 'text-[#1E8DD0]'
                }`}
              >
                Simplifying legal document processing and government scheme discovery with intelligent
                automation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Link href="/document-analyser">
                  <button
                    className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2 ${
                      darkMode
                        ? 'bg-[#B8E3E9] text-[#1E8DD0] hover:bg-[#93B1B5]'
                        : 'bg-[#1E8DD0] text-white hover:bg-[#0B2E33]'
                    }`}
                  >
                    <Upload size={24} />
                    <span>Parse Document</span>
                    <ArrowRight size={20} />
                  </button>
                </Link>
                <Link href="/communities">
                  <button
                    className={`px-4 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 border-2 ${
                      darkMode
                        ? 'border-[#B8E3E9] text-[#B8E3E9] hover:bg-[#B8E3E9] hover:text-[#0B2E33]'
                        : 'border-[#1E8DD0] text-[#1E8DD0] hover:bg-[#1E8DD0] hover:text-white'
                    }`}
                  >
                    Explore Communities
                  </button>
                </Link>
              </div>
            </div>

            {/* Right Side Video */}
            <div className="flex justify-center md:justify-end">
              <Lottie
                animationData={chatbotPersonAnimation}
                loop={true}
                autoplay={true}
                className="w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-30 bg-[#BAE6FF]/10">
        <div className="absolute top-100 right-0 w-100 h-102 z-0">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#F2F4F8" d="M62.4,-50.2C78,-30.2,85.9,-4.4,81.3,19.6C76.7,43.6,59.5,65.8,37.4,75.8C15.2,85.8,-12,83.6,-33.8,72.3C-55.6,61,-72.1,40.6,-78.5,16.7C-84.9,-7.1,-81.2,-34.5,-66.5,-54.4C-51.7,-74.2,-25.9,-86.6,-1.2,-85.6C23.4,-84.6,46.8,-70.3,62.4,-50.2Z" transform="translate(100 100)" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-50">
          <div className="text-center mb-16 z-100">
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              darkMode ? 'text-white' : 'text-[#1E8DD0]'
            }`}>
              Powerful Features
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${
              darkMode ? 'text-[#93B1B5]' : 'text-[#]'
            }`}>
              Everything you need to streamline legal document processing and government scheme discovery
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`animate-on-scroll px-8 py-2 rounded-2xl transition-all duration-500 hover:scale-105 border ${
                    darkMode 
                      ? 'bg-[#4F7C82]/10 border-[#4F7C82]/20 hover:bg-[#4F7C82]/15' 
                      : 'border-[##E6F3F9]/30 hover:bg-[#80B5DC]/20'
                  } ${isVisible[`feature-${index}`] ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'}`}
                  id={`feature-${index}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    darkMode ? 'bg-[#B8E3E9]/20' : 'bg-[#E6F3F9]/20'
                  }`}>
                    <Icon size={28} className={darkMode ? 'text-[#B8E3E9]' : 'text-[#1E8DD0]'} />
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-4 ${
                    darkMode ? 'text-white' : 'text-[#1E8DD0]'
                  }`}>
                    {feature.title}
                  </h3>
                  
                  <p className={`text mb-6 leading-relaxed ${
                    darkMode ? 'text-[#93B1B5]' : 'text-[#80B5DC]'
                  }`}>
                    {feature.description}
                  </p>

                  <ul className="space-y-2">
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"> 
          <div className="my-45">
            <div className="relative w-full h-30">
              {/* Left Half Circle */}
              <div
                className="absolute top-1/2 left-0 transform -translate-y-1/2
                          w-80 h-120 rounded-r-full flex items-center justify-center
                          text-white font-bold border-50 border-l-0 border-[#CADDE9] shadow-lg"
              >
                <Lottie
                  animationData={filesAnimation}
                  loop={true}
                  autoplay={true}
                  className="w-full max-w-md"
                />
              </div>

              {/* Petals */}
              {petals.map((petal, index) => {
                const angle = -45 + index * 50;
                const radius = 220;
                const rad = (angle * Math.PI) / 180;

                const circleCenterX = 60;
                const circleCenterY = 60;

                const x = circleCenterX + radius * Math.cos(rad);
                const y = circleCenterY + radius * Math.sin(rad);

                return (
                  <div
                    key={index}
                    className="absolute flex flex-col font-sans font-medium text-lg px-2"
                    style={{ left: `${x+100}px`, top: `${y-55}px` }}
                  >
                    <div className="font-semibold flex items-start p-2 text-[#1E8DD0]">
                      {petal.title}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 max-w-150">
                      {petal.points.map((point, i) => (
                        <div
                          key={i}
                          className="px-3 py-1 bg-[#EDF1F1] rounded shadow text-sm"
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 ${darkMode ? 'bg-[#4F7C82]/5' : 'bg-[#B8E3E9]/10'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`animate-on-scroll ${
            isVisible.cta ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-10'
          }`} id="cta">
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              darkMode ? 'text-[#CADDE9]' : 'text-[#1E8DD0]'
            }`}>
              Ready to Get Started?
            </h2>
            
            <p className={`text-xl mb-8 ${
              darkMode ? 'text-[#93B1B5]' : 'text-[#0B2E33]'
            }`}>
              Join thousands of users who trust LegalFlow for their document processing needs
            </p>
            <Link href="/login">
              <button className={`px-10 py-5 rounded-xl font-semibold text-xl transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center space-x-3 mx-auto ${
                darkMode 
                  ? 'bg-[#B8E3E9] text-[#0B2E33] hover:bg-[#93B1B5]' 
                  : 'bg-[#1E8DD0] text-white hover:bg-[#0B2E33]'
              }`}>
                
                <span>Start Free Trial</span>
                <ChevronRight size={20} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-10 border-t ${
        darkMode 
          ? 'bg-[#0B2E33] border-[#4F7C82]/20' 
          : 'bg-[#BAE6FF]/10 border-[#B8E3E9]/30'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className={`text-2xl font-bold mb-4 ${
                darkMode ? 'text-[#B8E3E9]' : 'text-[#0B2E33]'
              }`}>
                LegalFlow
              </h3>
              <p className={`text-lg mb-6 max-w-md ${
                darkMode ? 'text-[#93B1B5]' : 'text-[#1E8DD0]'
              }`}>
                Revolutionizing legal document processing with intelligent automation and comprehensive government scheme discovery.
              </p>
              <div className="flex space-x-4">
                {[Github, Mail, Phone].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                      darkMode 
                        ? 'bg-[#4F7C82]/20 text-[#B8E3E9] hover:bg-[#4F7C82]/30' 
                        : 'bg-[#B8E3E9]/20 text-[#1E8DD0] hover:bg-[#B8E3E9]/30'
                    }`}
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-[#0B2E33]'
              }`}>
                Quick Links
              </h4>
              <ul className="space-y-2">
                {['Document Parser', 'Government Schemes', 'About Us', 'Contact'].map((link) => (
                  <li key={link}>
                    <a href="#" className={`transition-colors hover:underline ${
                      darkMode ? 'text-[#93B1B5] hover:text-[#B8E3E9]' : 'text-[#1E8DD0] hover:text-[#0B2E33]'
                    }`}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className={`text-lg font-semibold mb-4 ${
                darkMode ? 'text-white' : 'text-[#0B2E33]'
              }`}>
                Legal
              </h4>
              <ul className="space-y-2">
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Data Protection'].map((link) => (
                  <li key={link}>
                    <a href="#" className={`transition-colors hover:underline ${
                      darkMode ? 'text-[#93B1B5] hover:text-[#B8E3E9]' : 'text-[#1E8DD0] hover:text-[#0B2E33]'
                    }`}>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={`mt-12 pt-8 border-t text-center ${
            darkMode ? 'border-[#4F7C82]/20 text-[#93B1B5]' : 'border-[#B8E3E9]/30 text-[#4F7C82]'
          }`}>
            <p>&copy; 2025 LegalFlow. All rights reserved. Built with precision and care.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}