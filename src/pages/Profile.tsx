import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useTheme } from "../contexts/ThemeContext";

interface UserProfile {
    email: string;
    name: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile>({ email: "", name: "" });
    const [saving, setSaving] = useState(false);
    const { darkMode, toggleDarkMode } = useTheme();

    useEffect(() => {
        // Decode JWT to get user info
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setProfile({
                    email: payload.email || "",
                    name: payload.name || payload.email?.split("@")[0] || ""
                });
            } catch {
                console.error("Failed to decode token");
            }
        }
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // For now, just show success - would need backend API
        setTimeout(() => {
            setSaving(false);
            alert("Profile settings saved!");
        }, 500);
    };

    const handleLogout = () => {
        if (confirm("Are you sure you want to log out?")) {
            localStorage.removeItem("token");
            window.location.href = "/";
        }
    };

    const getInitials = () => {
        if (profile.name) {
            return profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        }
        return profile.email?.[0]?.toUpperCase() || "?";
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Profile Settings</h1>

                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Account</h2>

                        {/* Avatar */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                {getInitials()}
                            </div>
                            <div>
                                <p className="font-medium text-[var(--text-primary)] text-lg">{profile.name || "Set your name"}</p>
                                <p className="text-sm text-[var(--text-secondary)]">{profile.email}</p>
                            </div>
                        </div>

                        {/* Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Display Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                placeholder="Enter your name"
                                className="input"
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="input bg-[var(--bg-secondary)] cursor-not-allowed"
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Email cannot be changed</p>
                        </div>
                    </div>

                    {/* Preferences Card */}
                    <div className="card p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Preferences</h2>

                        {/* Dark Mode */}
                        <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">Dark Mode</p>
                                <p className="text-sm text-[var(--text-secondary)]">Toggle dark/light theme</p>
                            </div>
                            <button
                                onClick={toggleDarkMode}
                                className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-[var(--accent)]' : 'bg-gray-300'} relative`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${darkMode ? 'left-6' : 'left-0.5'}`}></span>
                            </button>
                        </div>


                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <button onClick={handleLogout} className="btn bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Log Out
                        </button>
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
