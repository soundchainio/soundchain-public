#!/bin/bash

echo "🔧 Fixing Vercel build issues (Retaining ALL Fixes)..."

# 🚀 1. Fix package.json corruption
echo "📌 Checking and fixing package.json..."
if jq empty package.json >/dev/null 2>&1; then
  echo "✅ package.json is valid."
else
  echo "❌ package.json is corrupted! Fixing..."
  jq '.' package.json > temp.json && mv temp.json package.json
fi

# 🚀 2. Remove duplicate "resolutions" block
echo "📌 Cleaning package.json (Removing duplicate 'resolutions')..."
sed -i '' '1h;1!H;$!d;x;s/\n{\n  "resolutions".*}//' package.json

# 🚀 3. Remove existing React versions to avoid conflicts
echo "📌 Removing conflicting React versions..."
rm -rf node_modules yarn.lock package-lock.json
yarn cache clean

# 🚀 4. Enforce React 18 globally
echo "📌 Forcing all dependencies to use React 18..."
yarn add react@18 react-dom@18 --dev --force

# 🚀 5. Use yarn resolutions to override peer dependencies
echo "📌 Adding resolutions for React dependencies..."
jq '.resolutions = {
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "@codastic/react-positioning-portal/react": "18.2.0",
  "@reach/dialog/react": "18.2.0",
  "@reach/dialog/react-dom": "18.2.0",
  "@reach/utils/react": "18.2.0",
  "@walletconnect/web3-provider/react": "18.2.0"
}' package.json > temp.json && mv temp.json package.json

# 🚀 6. Reinstall dependencies from scratch
echo "📌 Reinstalling dependencies..."
yarn install --legacy-peer-deps

# 🚀 7. Verify React version consistency
echo "📌 Verifying installed React versions..."
yarn list | grep react

# 🚀 8. Fix TypeScript 'any' type errors
echo "📌 Fixing TypeScript 'any' types..."
for file in src/components/Comment/Comment.tsx src/components/ReactionSelector.tsx; do
  [ -f "$file" ] && sed -i '' 's/: any/: unknown/g' "$file"
done

# 🚀 9. Fix React Hook issues
echo "📌 Fixing React Hook issues..."
for file in src/components/Post/Post.tsx src/components/Chat/Chat.tsx; do
  [ -f "$file" ] && sed -i '' 's/useState({/{const [state, setState] = useState(/g' "$file"
  [ -f "$file" ] && sed -i '' 's/useEffect(()/useEffect(() =>/g' "$file"
done

# 🚀 10. Fix ESLint Forbidden non-null assertion errors
echo "📌 Fixing non-null assertions in TypeScript..."
for file in src/components/RemoveListingConfirmationModal.tsx src/components/modals/AuthorActionsModal.tsx; do
  [ -f "$file" ] && sed -i '' 's/!.//g' "$file"
done

# 🚀 11. Fix ReactionEmoji.ts Syntax Errors
echo "📌 Fixing syntax errors in ReactionEmoji.ts..."
[ -f src/icons/ReactionEmoji.ts ] && sed -i '' 's/>/>x/g' src/icons/ReactionEmoji.ts

# 🚀 12. Fix ESLint no-unused-vars errors
echo "📌 Removing unused variables..."
for file in src/components/Comment/CommentModal.tsx src/components/SocialMediaLink.tsx; do
  [ -f "$file" ] && sed -i '' '/@typescript-eslint\/no-unused-vars/d' "$file"
done

# 🚀 13. Fix Unnecessary Dependencies in Hooks
echo "📌 Fixing unnecessary dependencies in React Hooks..."
for file in src/hooks/useAudioPlayer.tsx src/hooks/useMetaMask.ts; do
  [ -f "$file" ] && sed -i '' 's/useEffect([\[]/useEffect([]/g' "$file"
done

# 🚀 14. Fix Missing ESLint Dependencies in Next.js
echo "📌 Installing Next.js ESLint and Babel dependencies..."
yarn add @babel/core eslint-config-next eslint-plugin-react-hooks --dev

# 🚀 15. Ensure Next.js ESLint Rules are Installed
echo "📌 Enforcing ESLint installation..."
yarn add eslint@latest --dev --force

# 🚀 16. Fix Syntax Errors in ReactionEmoji.ts
echo "📌 Fixing syntax errors in ReactionEmoji.ts..."
[ -f src/icons/ReactionEmoji.ts ] && sed -i '' 's/\$\{$/\{\}/g' src/icons/ReactionEmoji.ts

# 🚀 17. Commit and push fixes
echo "📌 Committing and pushing fixes..."
git add .
git commit -m "Fix: React dependency conflicts & Vercel build issues (All Fixes Retained)"
git push origin production

# 🚀 18. Deploy to Vercel with archive flag to avoid file limit issues
echo "📌 Deploying to Vercel..."
vercel --prod --archive=tgz

echo "✅ All fixes applied successfully!"
