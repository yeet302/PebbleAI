"use client";

import { useState } from "react";
import { UserProfile, ClassEntry } from "@/types";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Graduate"];

const EMPTY_CLASS: ClassEntry = { name: "", days: [], startTime: "09:00", endTime: "10:00" };

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    school: "",
    major: "",
    year: "1st year",
    classes: [],
    goals: [],
  });
  const [newClass, setNewClass] = useState<ClassEntry>({ ...EMPTY_CLASS });
  const [newGoal, setNewGoal] = useState("");

  const steps = ["About You", "Your Classes", "Your Goals", "All Set!"];

  const updateField = (field: keyof UserProfile, value: string) =>
    setProfile((p) => ({ ...p, [field]: value }));

  const toggleDay = (day: string) => {
    setNewClass((c) => ({
      ...c,
      days: c.days.includes(day) ? c.days.filter((d) => d !== day) : [...c.days, day],
    }));
  };

  const addClass = () => {
    if (!newClass.name.trim() || newClass.days.length === 0) return;
    setProfile((p) => ({ ...p, classes: [...p.classes, { ...newClass }] }));
    setNewClass({ ...EMPTY_CLASS });
  };

  const removeClass = (i: number) =>
    setProfile((p) => ({ ...p, classes: p.classes.filter((_, idx) => idx !== i) }));

  const addGoal = () => {
    if (!newGoal.trim()) return;
    setProfile((p) => ({ ...p, goals: [...p.goals, newGoal.trim()] }));
    setNewGoal("");
  };

  const removeGoal = (i: number) =>
    setProfile((p) => ({ ...p, goals: p.goals.filter((_, idx) => idx !== i) }));

  const canAdvance = () => {
    if (step === 0) return profile.name.trim() && profile.school.trim() && profile.major.trim();
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex rounded-t-2xl overflow-hidden">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 transition-colors ${i <= step ? "bg-blue-500" : "bg-gray-200"}`}
            />
          ))}
        </div>

        <div className="p-8">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Step {step + 1} of {steps.length}
          </p>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{steps[step]}</h2>

          {/* Step 0 — Basic info */}
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Your name" value={profile.name} onChange={(v) => updateField("name", v)} placeholder="e.g. Alex" />
              <Field label="School" value={profile.school} onChange={(v) => updateField("school", v)} placeholder="e.g. UW-Madison" />
              <Field label="Major" value={profile.major} onChange={(v) => updateField("major", v)} placeholder="e.g. Computer Science" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={profile.year}
                  onChange={(e) => updateField("year", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Step 1 — Classes */}
          {step === 1 && (
            <div className="space-y-4">
              {profile.classes.length > 0 && (
                <ul className="space-y-2">
                  {profile.classes.map((c, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-500 ml-2">{c.days.join("/")} {c.startTime}–{c.endTime}</span>
                      </span>
                      <button onClick={() => removeClass(i)} className="text-gray-400 hover:text-red-500 ml-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                <Field label="Class name" value={newClass.name} onChange={(v) => setNewClass((c) => ({ ...c, name: v }))} placeholder="e.g. CS 301" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          newClass.days.includes(d)
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-600 border-gray-300 hover:border-blue-300"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start</label>
                    <input type="time" value={newClass.startTime} onChange={(e) => setNewClass((c) => ({ ...c, startTime: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End</label>
                    <input type="time" value={newClass.endTime} onChange={(e) => setNewClass((c) => ({ ...c, endTime: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <button
                  onClick={addClass}
                  disabled={!newClass.name.trim() || newClass.days.length === 0}
                  className="w-full rounded-lg bg-blue-500 text-white py-1.5 text-sm font-medium hover:bg-blue-600 disabled:opacity-40"
                >
                  + Add Class
                </button>
              </div>
              <p className="text-xs text-gray-400">No classes yet? Skip this step.</p>
            </div>
          )}

          {/* Step 2 — Goals */}
          {step === 2 && (
            <div className="space-y-4">
              {profile.goals.length > 0 && (
                <ul className="space-y-2">
                  {profile.goals.map((g, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg bg-purple-50 px-3 py-2 text-sm">
                      <span>{g}</span>
                      <button onClick={() => removeGoal(i)} className="text-gray-400 hover:text-red-500 ml-2">✕</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGoal()}
                  placeholder="e.g. Land a software internship by May"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addGoal}
                  disabled={!newGoal.trim()}
                  className="rounded-lg bg-blue-500 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-gray-400">Add as many goals as you want — short or long term.</p>
            </div>
          )}

          {/* Step 3 — Confirm */}
          {step === 3 && (
            <div className="space-y-3 text-sm text-gray-600">
              <p>Hey <span className="font-semibold text-gray-800">{profile.name}</span>! Here's what I've got:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>{profile.major} student at {profile.school} ({profile.year})</li>
                <li>{profile.classes.length} class{profile.classes.length !== 1 ? "es" : ""} added</li>
                <li>{profile.goals.length} goal{profile.goals.length !== 1 ? "s" : ""} added</li>
              </ul>
              <p className="text-gray-500">I'll generate your schedule now. You can always update it by chatting with me.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setStep((s) => s - 1)}
              className={`text-sm text-gray-500 hover:text-gray-700 ${step === 0 ? "invisible" : ""}`}
            >
              ← Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={() => onComplete(profile)}
                className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700"
              >
                Generate My Schedule ✦
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
