"use client";

import React, { useState, useEffect } from "react";
import {
    Search,
    Play,
    Users,
    ChevronLeft,
    ChevronRight,
    Filter,
    SortAsc,
    Plus,
    Heart,
    MessageCircle,
    Share2,
    BookOpen,
    Video,
    TrendingUp,
    Sun,
    Moon
} from "lucide-react";
import NoSSR from "../../components/NoSSR";
import Navbar from "../../components/navbar";
import { useRouter } from "next/navigation";
import CommunityCard from "../../components/communityCard";
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../../firebase-config';
import {
    ref,
    push,
    onValue,
    remove,
    get,
    set,
    update,
    serverTimestamp,
    query,
    orderByChild,
    limitToLast
} from 'firebase/database';

const CommunitiesPage = () => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [communities, setCommunities] = useState([]);
    const [filteredCommunities, setFilteredCommunities] = useState([]);
    const [userMemberships, setUserMemberships] = useState(new Set());
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState('members');
    const [showFilters, setShowFilters] = useState(false);
    const [error, setError] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Load dark mode preference from localStorage
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('darkMode') === 'true';
        setDarkMode(savedDarkMode);
        if (savedDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newDarkMode = !darkMode;
        setDarkMode(newDarkMode);
        localStorage.setItem('darkMode', newDarkMode.toString());
        if (newDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Sample YouTube videos
    const videos = [
        {
            id: 1,
            url: "https://www.youtube.com/embed/t96A1DrsZTw",
            title: "Understanding Legal Contracts",
            views: "45K views",
            duration: "12:34"
        },
        {
            id: 2,
            url: "https://www.youtube.com/embed/fp051F5vb9I",
            title: "Government Schemes Explained",
            views: "32K views",
            duration: "8:45"
        },
        {
            id: 3,
            url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            title: "Property Law Basics",
            views: "28K views",
            duration: "15:20"
        },
        {
            id: 4,
            url: "https://www.youtube.com/embed/_WYqsW1lYbU",
            title: "Intellectual Property Rights",
            views: "19K views",
            duration: "10:12"
        },
        {
            id: 5,
            url: "https://www.youtube.com/embed/Kd0SKouTtQY",
            title: "Consumer Protection Laws",
            views: "24K views",
            duration: "9:30"
        },
    ];

    const categories = [
        'All', 'Contract', 'Property', 'Consumer', 'Family',
        'Business', 'Finance', 'Immigration', 'Cyber', 'Criminal', 'Employment'
    ];

    // Initialize default communities if none exist
    const initializeDefaultCommunities = async () => {
        try {
            const communitiesRef = ref(database, 'communities');
            const snapshot = await get(communitiesRef);

            if (!snapshot.exists()) {
                const defaultCommunities = [
                    {
                        name: "Contract Law Experts",
                        avatar: "/icons/contract_law.png",
                        category: "Contract",
                        description: "Discuss contract clauses, review agreements, and get legal opinions.",
                        members: 1520,
                        thumbnail: "https://source.unsplash.com/400x300/?law,contract",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["contracts", "agreements", "legal-review"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    },
                    {
                        name: "Property Law & Real Estate",
                        avatar: "/icons/property_law.png",
                        category: "Property",
                        description: "Share insights on property disputes, ownership laws, and tenancy agreements.",
                        members: 980,
                        thumbnail: "https://source.unsplash.com/400x300/?property,law",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["property", "real-estate", "tenancy"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    },
                    {
                        name: "Consumer Rights Forum",
                        avatar: "/icons/consumer-rights.png",
                        category: "Consumer",
                        description: "Discuss complaints, product/service issues, and consumer protection laws.",
                        members: 1340,
                        thumbnail: "https://source.unsplash.com/400x300/?consumer,law",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["consumer-rights", "complaints", "protection"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    },
                    {
                        name: "Family & Divorce Law",
                        avatar: "/icons/family_law.png",
                        category: "Family",
                        description: "Get advice on divorce, custody, maintenance, and other family matters.",
                        members: 765,
                        thumbnail: "https://source.unsplash.com/400x300/?family,law",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["family-law", "divorce", "custody"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    },
                    {
                        name: "Startup & Business Law",
                        avatar: "/icons/business_law.png",
                        category: "Business",
                        description: "Legal guidance for startups: incorporation, compliance, contracts, and funding.",
                        members: 1120,
                        thumbnail: "https://source.unsplash.com/400x300/?startup,law",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["business", "startups", "compliance"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    },
                    {
                        name: "Tax & Finance Law",
                        avatar: "/icons/tax.png",
                        category: "Finance",
                        description: "Share insights on tax planning, filing, GST, and financial regulations.",
                        members: 890,
                        thumbnail: "https://source.unsplash.com/400x300/?tax,law",
                        createdBy: "admin",
                        createdAt: serverTimestamp(),
                        isActive: true,
                        tags: ["tax", "finance", "gst"],
                        rules: [
                            "Be respectful and professional",
                            "No spam or self-promotion",
                            "Share reliable legal information only"
                        ]
                    }
                ];

                for (let i = 0; i < defaultCommunities.length; i++) {
                    const community = defaultCommunities[i];
                    const communityRef = ref(database, `communities/community_${i + 1}`);
                    await set(communityRef, community);
                }

                console.log('Default communities initialized');
            }
        } catch (error) {
            console.error('Error initializing communities:', error);
            setError('Failed to load communities');
        }
    };

    // Load communities from Firebase
    const loadCommunities = () => {
        try {
            const communitiesRef = ref(database, 'communities');
            const unsubscribe = onValue(communitiesRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const communitiesArray = Object.entries(data).map(([id, community]) => ({
                        id,
                        ...community,
                        members: community.members || 0
                    }));
                    setCommunities(communitiesArray);
                    setFilteredCommunities(communitiesArray);
                } else {
                    setCommunities([]);
                    setFilteredCommunities([]);
                }
            }, (error) => {
                console.error('Error loading communities:', error);
                setError('Failed to load communities');
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error setting up communities listener:', error);
            setError('Failed to initialize communities');
        }
    };

    // Load user memberships
    const loadUserMemberships = (userId) => {
        try {
            const membershipsRef = ref(database, `userMemberships/${userId}`);
            const unsubscribe = onValue(membershipsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const membershipSet = new Set(Object.keys(data));
                    setUserMemberships(membershipSet);
                } else {
                    setUserMemberships(new Set());
                }
            });

            return unsubscribe;
        } catch (error) {
            console.error('Error loading user memberships:', error);
        }
    };

    // Join/Leave community
    const toggleCommunityMembership = async (communityId, isCurrentlyMember) => {
        if (!user) {
            setError('Please log in to join communities');
            return;
        }

        try {
            const membershipRef = ref(database, `userMemberships/${user.uid}/${communityId}`);
            const communityRef = ref(database, `communities/${communityId}`);
            const communityMembersRef = ref(database, `communityMembers/${communityId}/${user.uid}`);

            if (isCurrentlyMember) {
                await remove(membershipRef);
                await remove(communityMembersRef);

                const communitySnapshot = await get(communityRef);
                if (communitySnapshot.exists()) {
                    const currentMembers = communitySnapshot.val().members || 0;
                    await update(communityRef, {
                        members: Math.max(0, currentMembers - 1)
                    });
                }
            } else {
                await set(membershipRef, {
                    joinedAt: serverTimestamp(),
                    communityName: communities.find(c => c.id === communityId)?.name || 'Unknown'
                });

                await set(communityMembersRef, {
                    joinedAt: serverTimestamp(),
                    userId: user.uid,
                    userEmail: user.email,
                    userName: user.displayName || user.email
                });

                const communitySnapshot = await get(communityRef);
                if (communitySnapshot.exists()) {
                    const currentMembers = communitySnapshot.val().members || 0;
                    await update(communityRef, {
                        members: currentMembers + 1
                    });
                }
            }
        } catch (error) {
            console.error('Error toggling membership:', error);
            setError('Failed to update membership');
        }
    };

    // Create new community
    const createCommunity = async (communityData) => {
        if (!user) {
            setError('Please log in to create communities');
            return;
        }

        try {
            const communityId = `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const communityRef = ref(database, `communities/${communityId}`);

            const newCommunityData = {
                ...communityData,
                createdBy: user.uid,
                createdByName: user.displayName || user.email,
                createdAt: serverTimestamp(),
                members: 1,
                isActive: true,
                rules: communityData.rules || [
                    "Be respectful and professional",
                    "No spam or self-promotion",
                    "Share reliable legal information only"
                ]
            };

            await set(communityRef, newCommunityData);
            await toggleCommunityMembership(communityId, false);

            setCreateModalOpen(false);
        } catch (error) {
            console.error('Error creating community:', error);
            setError('Failed to create community');
        }
    };

    // Filter and sort communities
    useEffect(() => {
        let filtered = communities;

        if (searchQuery.trim()) {
            filtered = filtered.filter(community =>
                community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                community.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                community.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(community => community.category === selectedCategory);
        }

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'members':
                    return (b.members || 0) - (a.members || 0);
                case 'newest':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'activity':
                    return (b.lastActivity || 0) - (a.lastActivity || 0);
                case 'alphabetical':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });

        setFilteredCommunities(filtered);
    }, [communities, searchQuery, selectedCategory, sortBy]);

    // Auth and data loading
    useEffect(() => {
        setIsMounted(true);

        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                loadUserMemberships(u.uid);
            } else {
                setUserMemberships(new Set());
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    // Load communities when component mounts
    useEffect(() => {
        if (isMounted && database) {
            initializeDefaultCommunities();
            const unsubscribe = loadCommunities();
            return () => unsubscribe && unsubscribe();
        }
    }, [isMounted]);

    const VideoCard = ({ video }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden min-w-[320px] hover:shadow-xl transition-shadow">
            <div className="relative">
                <iframe
                    width="100%"
                    height="200"
                    src={video.url}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-t-lg"
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {video.title}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{video.views}</span>
                    <div className="flex space-x-2">
                        <button className="hover:text-red-500 transition-colors">
                            <Heart className="w-4 h-4" />
                        </button>
                        <button className="hover:text-blue-500 transition-colors">
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // Community Creation Modal
    const CreateCommunityModal = () => {
        const [formData, setFormData] = useState({
            name: '',
            category: 'Contract',
            description: '',
            avatar: '/icons/default-community.png',
            tags: '',
            isPrivate: false
        });

        const handleSubmit = (e) => {
            e.preventDefault();
            if (formData.name.trim() && formData.description.trim()) {
                const communityData = {
                    ...formData,
                    tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                };
                createCommunity(communityData);
            }
        };

        if (!createModalOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Create New Community
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Community Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                {categories.filter(cat => cat !== 'All').map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                placeholder="contracts, legal, advice"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isPrivate"
                                checked={formData.isPrivate}
                                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                                className="mr-2"
                            />
                            <label htmlFor="isPrivate" className="text-sm text-gray-700 dark:text-gray-300">
                                Private Community (invitation only)
                            </label>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-[#1E8DD0] hover:bg-blue-600 text-white rounded-lg"
                            >
                                Create Community
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (!isMounted) return null;

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className={`mt-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Loading communities...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
            <NoSSR />
            <Navbar />

            {/* Dark Mode Toggle */}
            <button
                onClick={toggleDarkMode}
                className="fixed top-20 right-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all"
                aria-label="Toggle dark mode"
            >
                {darkMode ? (
                    <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                    <Moon className="w-5 h-5 text-gray-700" />
                )}
            </button>

            {/* Error Toast */}
            {error && (
                <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
                    <div className="flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-2 text-white hover:text-gray-200">
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Background decorations */}
            <div className="fixed bottom-0 left-0 w-400 h-400 z-[0]">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#daeef9" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
                </svg>
            </div>

            <div className="fixed bottom-0 left-0 w-200 h-200 z-[0]">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#f1f3f4" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
                </svg>
            </div>

            <div className="fixed top-10 left-20 w-400 h-400 z-[0]">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#f1f3f4" d="M49.3,0.7C49.3,21.2,24.7,42.3,-2.2,42.3C-29,42.3,-58,21.2,-58,0.7C-58,-19.8,-29,-39.7,-2.2,-39.7C24.7,-39.7,49.3,-19.8,49.3,0.7Z" transform="translate(100 100)" />
                </svg>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-xl mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search communities, topics, or legal advice..."
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1E8DD0]"
                        />
                    </div>
                </div>

                {/* Featured Videos */}
                <div className="mb-12 z-50 relative">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Video className="w-6 h-6 mr-2 text-[#1E8DD0]" />
                            Featured Legal Content
                        </h2>
                        <div className="flex space-x-2">
                            <button className="p-2 rounded-full bg-white dark:bg-gray-800 shadow hover:shadow-lg transition-shadow">
                                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button className="p-2 rounded-full bg-white dark:bg-gray-800 shadow hover:shadow-lg transition-shadow">
                                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>

                    <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                </div>

                {/* Communities Section */}
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center">
                                <Users className="w-8 h-8 mr-3 text-[#1E8DD0]" />
                                Join Communities
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                Connect with others, get advice, and share knowledge • {filteredCommunities.length} communities
                            </p>
                        </div>
                        <div className="flex space-x-2">
                            {user && (
                                <button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="px-4 py-2 bg-[#1E8DD0] hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create</span>
                                </button>
                            )}

                            <div className="relative">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="px-4 py-2 bg-white dark:bg-gray-800 border border-[#1E8DD0] dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                    <Filter className="w-4 h-4" />
                                    <span>Filter</span>
                                </button>

                                {showFilters && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 z-20">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Category
                                            </label>
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                {categories.map(category => (
                                                    <option key={category} value={category}>{category}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Sort by
                                            </label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="members">Most Members</option>
                                                <option value="newest">Newest</option>
                                                <option value="activity">Most Active</option>
                                                <option value="alphabetical">Alphabetical</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>{/* Category Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {categories.map(category => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                                        ? 'bg-[#1E8DD0] text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {category}
                                {category !== 'All' && (
                                    <span className="ml-1 text-xs opacity-75">
                                        ({communities.filter(c => c.category === category).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Communities Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 z-50 relative">
                        {filteredCommunities.map((community) => (
                            <CommunityCardWithFirebase
                                key={community.id}
                                community={community}
                            />
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredCommunities.length === 0 && (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                No communities found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to create a community!'}
                            </p>
                            {user && !searchQuery && (
                                <button
                                    onClick={() => setCreateModalOpen(true)}
                                    className="bg-[#1E8DD0] hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                                >
                                    Create Community
                                </button>
                            )}
                        </div>
                    )}

                    {/* Load More Button */}
                    {filteredCommunities.length > 0 && filteredCommunities.length >= 12 && (
                        <div className="text-center mt-8">
                            <button className="bg-[#1E8DD0] hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors z-50 relative">
                                Load More Communities
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Community Modal */}
            <CreateCommunityModal />

            <style jsx>{`
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}</style>
        </div>);
};
// CommunityCard used in the listing
const CommunityCardWithFirebase = ({ community }) => {
    const router = useRouter();
    const handleCardClick = () => {
        const query = new URLSearchParams({
            name: community.name,
            avatar: community.avatar,
            category: community.category,
            description: community.description,
            members: community.members,
        }).toString(); router.push(`/community/${community.id}?${query}`);
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-6 group cursor-pointer">
            <div onClick={handleCardClick}>
                {/* Community Avatar */}
                <div className="flex justify-center items-center mb-4">
                    <div className="relative">
                        <img
                            src={community.avatar}
                            alt={community.name}
                            className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700 group-hover:scale-105 transition-transform"
                            onError={(e) => {
                                e.target.src = '/icons/default-community.png';
                            }}
                        />
                        {community.isActive && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                    </div>
                </div>{/* Category Badge */}
                <div className="flex justify-center mb-3">
                    <span className="text-xs bg-blue-100 dark:bg-[#a7d6f2] text-[#145c86] dark:text-blue-800 px-3 py-1 rounded-full font-medium">
                        {community.category}
                    </span>
                </div>

                {/* Community Info */}
                <div className="flex-1 text-center mb-4">
                    <h3 className="font-bold text-lg text-[#1E8DD0] dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {community.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 leading-relaxed">
                        {community.description}
                    </p>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="space-y-3">
                {/* Member Count and Tags */}
                <div className="flex items-center justify-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{community.members?.toLocaleString() || 0} members</span>
                    </div>
                    {community.lastActivity && (
                        <div className="flex items-center space-x-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-xs">Active</span>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {community.tags && community.tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1">
                        {community.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Open Button */}
                <div className="pt-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick();
                        }}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-[#1E8DD0] hover:bg-[#145c86] text-white transform hover:scale-105"
                    >
                        Open
                    </button>
                </div>

                {/* Community Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                    <span>
                        Created {community.createdAt ? new Date(community.createdAt).toLocaleDateString() : 'Recently'}
                    </span>
                    {community.isPrivate && (
                        <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Private
                        </span>
                    )}
                </div>
            </div>
        </div>);
};
export default CommunitiesPage;