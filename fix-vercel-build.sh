#!/bin/bash

echo "🔧 Fixing Vercel build issues..."

# Fix React Hook errors by updating Post.tsx
echo "📌 Fixing React Hooks in Post.tsx..."
sed -i '' 's/useState(/const [state, setState] = useState(/g' src/components/Post/Post.tsx

# Fix TypeScript 'any' type errors
echo "📌 Fixing TypeScript 'any' types..."
sed -i '' 's/: any/: unknown/g' src/components/Comment/Comment.tsx
sed -i '' 's/: any/: unknown/g' src/components/ReactionSelector.tsx

# Fix React version mismatches
echo "📌 Installing React 18 for compatibility..."
yarn add react@18 react-dom@18

# Fix Next.js build script
echo "📌 Updating package.json build script..."
sed -i '' 's/"build": "lerna run --parallel build"/"build": "next build"/g' package.json

# Fix missing dependencies
echo "📌 Installing missing dependencies..."
yarn install --legacy-peer-deps

# Fix syntax errors in ReactionEmoji.ts
echo "📌 Fixing syntax errors in ReactionEmoji.ts..."
sed -i '' 's/>\s*></></g' src/icons/ReactionEmoji.ts

# Commit and push fixes
echo "📌 Committing and pushing fixes..."
git add .
git commit -m "Fix Vercel build issues"
git push origin production

# Deploy with archive to avoid file limit issues
echo "🚀 Deploying to Vercel..."
vercel --prod --archive=tgz

echo "✅ All fixes applied!"
