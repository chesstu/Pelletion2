import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Custom CSS for Twitch-themed styling
const style = document.createElement("style");
style.textContent = `
  :root {
    --background: 240 14% 5%;
    --foreground: 240 5% 94%;
    --card: 240 13% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 13% 10%;
    --popover-foreground: 0 0% 98%;
    --primary: 265 100% 64%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 5% 18%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 4% 16%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 175 100% 35%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 84% 65%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5% 15%;
    --input: 240 5% 15%;
    --ring: 265 100% 64%;
    
    --chart-1: 265 100% 64%;
    --chart-2: 175 100% 35%;
    --chart-3: 120 100% 50%;
    --chart-4: 35 100% 60%;
    --chart-5: 0 84% 65%;
    
    --radius: 0.5rem;
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
  
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: hsl(var(--secondary));
  }
  
  ::-webkit-scrollbar-thumb {
    background: hsl(var(--primary));
    border-radius: 4px;
  }
  
  .hover-scale {
    transition: transform 0.2s;
  }
  
  .hover-scale:hover {
    transform: scale(1.05);
  }
  
  .hover-glow:hover {
    box-shadow: 0 0 15px rgba(145, 70, 255, 0.5);
  }

  .section-title::after {
    content: '';
    display: block;
    width: 60px;
    height: 4px;
    background-color: hsl(var(--primary));
    margin-top: 8px;
    border-radius: 2px;
  }

  .live-indicator {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(style);

// Add Inter font
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

// Add page title
const title = document.createElement("title");
title.textContent = "Pelletion - Gaming Battles & Highlights";
document.head.appendChild(title);

createRoot(document.getElementById("root")!).render(<App />);
