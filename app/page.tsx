"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "./styles.css";
import AuthButton from "./components/AuthButton";

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export default function GroupsLanding() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, []);

  const go = (slug?: string) => {
    router.push(slug ? `/chat?group=${slug}` : "/chat");
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      setGroups((prev) => [...prev, data]);
      setNewName("");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-topbar">
        <AuthButton />
      </div>

      <div className="landing-hero">
        <h1 className="landing-title">Choose your AI Assistant</h1>
        <p className="landing-subtitle">
          Pick a course AI to get answers from uploaded materials, or start a general chat.
        </p>
      </div>

      {loading ? (
        <p className="landing-loading">Loading…</p>
      ) : (
        <div className="landing-grid">
          {groups.map((g) => (
            <button key={g.id} className="landing-card" onClick={() => go(g.slug)}>
              <span className="landing-card-name">{g.name} AI</span>
              {g.description && (
                <span className="landing-card-desc">{g.description}</span>
              )}
            </button>
          ))}

          <button
            className="landing-card landing-card--general"
            onClick={() => go()}
          >
            <span className="landing-card-name">General Chat</span>
            <span className="landing-card-desc">No course context — just ask anything.</span>
          </button>

          {/* Add group card */}
          {showCreateForm ? (
            <form className="landing-card landing-card--create" onSubmit={handleCreate}>
              <input
                className="landing-create-input"
                placeholder="Group name (e.g. CMPT 276)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                disabled={creating}
              />
              {createError && <p className="landing-create-error">{createError}</p>}
              <div className="landing-create-actions">
                <button
                  type="submit"
                  className="landing-create-submit"
                  disabled={creating || !newName.trim()}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  className="landing-create-cancel"
                  onClick={() => { setShowCreateForm(false); setNewName(""); setCreateError(null); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              className="landing-card landing-card--add"
              onClick={() => setShowCreateForm(true)}
            >
              <span className="landing-card-plus">+</span>
              <span className="landing-card-desc">Add a new course group</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
