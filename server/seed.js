/**
 * seed.js  –  Upload demo data to MongoDB
 *
 * Usage (from the /server directory):
 *   node seed.js            → inserts demo data (skips if already seeded)
 *   node seed.js --fresh    → wipes all existing data first, then seeds
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// The .env file is in the parent directory (root of the repo)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import Content from "./models/Content.js";
import Session from "./models/Session.js";
import User from "./models/User.js";

// ─── Demo data ────────────────────────────────────────────────────────────────

const USERS = [
  {
    name: "Avery Brooks",
    email: "admin@gmail.com",
    password: "demo123",
    role: "admin",
    status: "active",
    rewardPoints: 0,
    bio: "Platform admin coordinating cohorts, mentors, and learning content.",
    availableTimeSlots: ["Mon 10:00", "Thu 14:00"],
    skills: [
      { name: "Operations", level: "advanced" },
      { name: "Program Design", level: "advanced" },
    ],
  },
  {
    name: "Maya Chen",
    email: "maya@gmail.com",
    password: "demo123",
    role: "mentor",
    status: "active",
    rewardPoints: 10,
    bio: "Frontend engineer mentoring students on React architecture and product thinking.",
    availableTimeSlots: ["Tue 18:00", "Thu 17:00"],
    skills: [
      { name: "React", level: "advanced" },
      { name: "JavaScript", level: "advanced" },
      { name: "UI Design", level: "intermediate" },
    ],
  },
  {
    name: "Ravi Patel",
    email: "ravi@gmail.com",
    password: "demo123",
    role: "mentor",
    status: "active",
    rewardPoints: 0,
    bio: "Backend mentor focused on Node.js APIs, databases, and production hygiene.",
    availableTimeSlots: ["Wed 19:00", "Sat 11:00"],
    skills: [
      { name: "Node.js", level: "advanced" },
      { name: "MongoDB", level: "advanced" },
      { name: "System Design", level: "intermediate" },
    ],
  },
  {
    name: "Jordan Kim",
    email: "jordan@gmail.com",
    password: "demo123",
    role: "student",
    status: "active",
    rewardPoints: 0,
    bio: "Student building stronger React and API integration skills.",
    availableTimeSlots: ["Tue 18:00", "Fri 16:00"],
    skills: [
      { name: "React", level: "intermediate" },
      { name: "JavaScript", level: "intermediate" },
    ],
  },
  {
    name: "Elena Gomez",
    email: "elena@gmail.com",
    password: "demo123",
    role: "student",
    status: "active",
    rewardPoints: 0,
    bio: "Student focusing on backend fundamentals and database modeling.",
    availableTimeSlots: ["Wed 19:00", "Sat 10:00"],
    skills: [
      { name: "Node.js", level: "beginner" },
      { name: "MongoDB", level: "beginner" },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  const fresh = process.argv.includes("--fresh");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  if (fresh) {
    console.log("--fresh flag detected. Wiping existing data...");
    await Promise.all([User.deleteMany(), Session.deleteMany(), Content.deleteMany()]);
    console.log("Collections cleared.\n");
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const userDocs = [];

  for (const userData of USERS) {
    const existing = await User.findOne({ email: userData.email });

    if (existing) {
      console.log(`  [skip] User already exists: ${userData.email}`);
      userDocs.push(existing);
      continue;
    }

    const hashed = await bcrypt.hash(userData.password, 10);
    const user = await User.create({ ...userData, password: hashed });
    console.log(`  [created] User: ${user.email} (${user.role})`);
    userDocs.push(user);
  }

  // Build an email → _id lookup map
  const byEmail = Object.fromEntries(userDocs.map((u) => [u.email, u._id]));

  // ── Sessions ───────────────────────────────────────────────────────────────
  console.log("");

  const SESSIONS = [
    {
      mentorEmail: "maya@gmail.com",
      studentEmail: "jordan@gmail.com",
      date: new Date("2026-03-14T00:00:00.000Z"),
      timeSlot: { start: "18:00", end: "19:00" },
      status: "completed",
      sessionLink: "demo-react-101",
      videoUrl: "https://www.youtube.com/watch?v=dGcsHMXbSOA",
      review: { rating: 5, comment: "Clear and actionable React guidance." },
      reviewSubmittedAt: new Date("2026-03-14T20:00:00.000Z"),
      rewardPointsGranted: true,
    },
    {
      mentorEmail: "ravi@gmail.com",
      studentEmail: "elena@gmail.com",
      date: new Date("2026-03-15T00:00:00.000Z"),
      timeSlot: { start: "11:00", end: "12:00" },
      status: "completed",
      sessionLink: "demo-node-review",
      videoUrl: "https://www.youtube.com/watch?v=TlB_eWDSMt4",
      review: { rating: 2, comment: "The session moved too fast and left key backend concepts unclear." },
      reviewSubmittedAt: new Date("2026-03-15T13:45:00.000Z"),
      rewardPointsGranted: false,
    },
    {
      mentorEmail: "maya@gmail.com",
      studentEmail: "elena@gmail.com",
      date: new Date("2026-03-18T00:00:00.000Z"),
      timeSlot: { start: "17:00", end: "18:00" },
      status: "pending",
      sessionLink: "demo-ui-coaching",
      videoUrl: "https://vimeo.com/76979871",
      studentNotificationExpiresAt: new Date(Date.now() + 30 * 1000),
    },
  ];

  for (const s of SESSIONS) {
    const existing = await Session.findOne({ sessionLink: s.sessionLink });

    if (existing) {
      console.log(`  [skip] Session already exists: ${s.sessionLink}`);
      continue;
    }

    await Session.create({
      mentor: byEmail[s.mentorEmail],
      student: byEmail[s.studentEmail],
      date: s.date,
      timeSlot: s.timeSlot,
      status: s.status,
      sessionLink: s.sessionLink,
      videoUrl: s.videoUrl,
      review: s.review,
      reviewSubmittedAt: s.reviewSubmittedAt,
      rewardPointsGranted: s.rewardPointsGranted || false,
      studentNotificationExpiresAt: s.studentNotificationExpiresAt,
    });
    console.log(`  [created] Session: ${s.sessionLink}`);
  }

  // ── Content ────────────────────────────────────────────────────────────────
  console.log("");

  const adminId = byEmail["admin@gmail.com"];

  const CONTENT = [
    {
      title: "React State and Effects",
      description: "A practical walkthrough of state, side effects, and component data flow.",
      videoUrl: "https://www.youtube.com/watch?v=O6P86uwfdR0",
    },
    {
      title: "Node API Architecture",
      description: "How to split controllers, routes, and models in a maintainable backend.",
      videoUrl: "https://www.youtube.com/watch?v=pKd0Rpw7O48",
    },
    {
      title: "MongoDB Schema Design",
      description: "A concise overview of references, embedding, and document modeling tradeoffs.",
      videoUrl: "https://www.youtube.com/watch?v=ofme2o29ngU",
    },
  ];

  for (const item of CONTENT) {
    const existing = await Content.findOne({ title: item.title });

    if (existing) {
      console.log(`  [skip] Content already exists: "${item.title}"`);
      continue;
    }

    await Content.create({ ...item, uploadedBy: adminId });
    console.log(`  [created] Content: "${item.title}"`);
  }

  console.log("\nSeeding complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
