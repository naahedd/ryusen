# Ryusen

Explore AI conversations through an interactive graph. Each thought branches into multiple possibilities, creating a visual tree of AI responses with varying levels of creativity.


## What it does
- Map out conversations visually with connected nodes
- Get multiple AI perspectives on each prompt (adjustable from 1-5 responses)
- Fine-tune response creativity per branch
- Drag, rearrange, and sculpt your conversation tree
- Export your maps as JSON or ASCII trees

## Quick Start
1. Add your Gemini API key to `.env.local`:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
   ```
2. Install and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Usage Tips
- Select a node before typing your prompt
- Hold Alt to drag unselected nodes
- Selected nodes are always draggable
- Delete key removes selected nodes and their children
- Save your work as JSON to reload it later

## Built with
- Next.js
- React Flow for graph visualization
- Google's Gemini API
- TypeScript

## Development

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

[... rest of your existing Next.js documentation ...]
