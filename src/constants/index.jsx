import { BotMessageSquare } from "lucide-react";
import { BatteryCharging } from "lucide-react";
import { Fingerprint } from "lucide-react";
import { ShieldHalf } from "lucide-react";
import { PlugZap } from "lucide-react";
import { GlobeLock } from "lucide-react";

import user1 from "../assets/profile-pictures/user1.jpg";
import user2 from "../assets/profile-pictures/user2.jpg";
import user3 from "../assets/profile-pictures/user3.jpg";
import user4 from "../assets/profile-pictures/user4.jpg";
import user5 from "../assets/profile-pictures/user5.jpg";
import user6 from "../assets/profile-pictures/user6.jpg";

export const navItems = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
];

export const testimonials = [
  {
    user: "John Doe",
    company: "Stellar Solutions",
    image: user1,
    text: "Cryogena has transformed the way we manage our files across the organization. Secure, fast, and extremely reliable.",
  },
  {
    user: "Jane Smith",
    company: "Blue Horizon Technologies",
    image: user2,
    text: "With Cryogena, sharing files and collaborating with my team has never been easier. The role-based access keeps everything secure.",
  },
  {
    user: "David Johnson",
    company: "Quantum Innovations",
    image: user3,
    text: "Cryogena's intuitive interface and trash/favorites feature make file management effortless. Highly recommended for any organization.",
  },
  {
    user: "Ronee Brown",
    company: "Fusion Dynamics",
    image: user4,
    text: "Our workflow has drastically improved since adopting Cryogena. Scheduled deletes and analytics give us complete control over our data.",
  },
  {
    user: "Michael Wilson",
    company: "Visionary Creations",
    image: user5,
    text: "Cryogena combines security, speed, and simplicity in a way no other file storage solution does. It’s essential for our daily operations.",
  },
  {
    user: "Emily Davis",
    company: "Synergy Systems",
    image: user6,
    text: "We love Cryogena! Managing files, setting permissions, and collaborating in real-time is smooth and hassle-free.",
  },
];

export const features = [
  {
    icon: <BotMessageSquare />,
    text: "Drag-and-Drop Uploads",
    description:
      "Easily upload and organize files with Cryogena's intuitive drag-and-drop interface.",
  },
  {
    icon: <Fingerprint />,
    text: "Role-Based Access",
    description:
      "Control who can view, edit, or delete files with granular role-based permissions.",
  },
  {
    icon: <ShieldHalf />,
    text: "Secure Storage",
    description:
      "All files are encrypted and stored securely, ensuring your data is safe from unauthorized access.",
  },
  {
    icon: <BatteryCharging />,
    text: "Real-Time Sync",
    description:
      "Files are synced instantly across devices, so your team always has access to the latest version.",
  },
  {
    icon: <PlugZap />,
    text: "Team Collaboration",
    description:
      "Share files, leave comments, and work together seamlessly within Cryogena.",
  },
  {
    icon: <GlobeLock />,
    text: "Analytics & Monitoring",
    description:
      "Track file usage, user activity, and system performance with built-in analytics tools.",
  },
];

export const checklistItems = [
  {
    title: "Organize files effortlessly",
    description:
      "Drag, drop, and categorize your files with Cryogena's simple interface.",
  },
  {
    title: "Manage user roles securely",
    description:
      "Set custom permissions for each team member and protect sensitive data.",
  },
  {
    title: "Automated cleanup",
    description:
      "Schedule automatic deletion of old or unwanted files to keep storage optimized.",
  },
  {
    title: "Favorites and Trash",
    description:
      "Quickly mark important files as favorites or recover deleted items from trash.",
  },
];

export const pricingOptions = [
  {
    title: "Free",
    price: "$0",
    features: [
      "5 GB Storage",
      "Basic File Management",
      "Trash & Favorites",
      "Single Organization",
    ],
  },
  {
    title: "Pro",
    price: "$10",
    features: [
      "50 GB Storage",
      "Advanced File Sharing",
      "Role-Based Permissions",
      "Analytics Dashboard",
    ],
  },
];

export const resourcesLinks = [
  { href: "#", text: "Getting Started" },
  { href: "#", text: "Documentation" },
  { href: "#", text: "Tutorials" },
  { href: "#", text: "API Reference" },
  { href: "#", text: "Community Forum" },
];

export const platformLinks = [
  { href: "#", text: "Features" },
  { href: "#", text: "Supported Devices" },
  { href: "#", text: "System Requirements" },
  { href: "#", text: "Downloads" },
  { href: "#", text: "Release Notes" },
];

export const communityLinks = [
  { href: "#", text: "Events" },
  { href: "#", text: "Meetups" },
  { href: "#", text: "Conferences" },
  { href: "#", text: "Hackathons" },
  { href: "#", text: "Jobs" },
];
