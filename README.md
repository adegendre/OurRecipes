# Our Recipes - Recipe Manager

A simple, powerful web app for managing your recipe collection with support for multiple import formats.

## Features

- 📝 Import recipes from JSON, plain text, Markdown, or Apple Notes
- 🏷️ Tag-based organization (type, region, meal, source)
- 🔍 Smart search and filtering
- 📊 Similar recipe suggestions
- 💾 Export to JSON, Markdown, or Rich Text
- 🔒 Privacy-first: all data stored locally in your browser

## Quick Start

Simply open `index.html` in a web browser to start using the app.

## Deployment Options

### Option 1: GitHub Pages (Recommended)

1. **Create a new GitHub repository**
   ```bash
   cd "/Users/dea3/Desktop/Dev/Claude Code tests/Recipes app "
   git init
   git add index.html recipe-app.jsx README.md
   git commit -m "Initial commit: Our Recipes app"
   ```

2. **Push to GitHub**
   ```bash
   # Create a new repository on GitHub named "our-recipes"
   git remote add origin https://github.com/YOUR_USERNAME/our-recipes.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Select "main" branch as source
   - Click "Save"
   - Your app will be live at: `https://YOUR_USERNAME.github.io/our-recipes/`

### Option 2: Netlify Drop

1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop the folder containing `index.html` and `recipe-app.jsx`
3. Your site will be instantly live with a generated URL
4. Optional: Configure a custom domain in Netlify settings

### Option 3: Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

### Option 4: Local File System

Simply open `index.html` directly in your browser. Note: Some features may be limited due to browser security restrictions.

## Import Format Examples

### Plain Text
```
Chocolate Chip Cookies

Ingredients:
- 2 cups flour
- 1 cup butter
- 1 cup chocolate chips

Instructions:
Mix ingredients and bake at 350°F for 12 minutes.
```

### Markdown
```markdown
## Spaghetti Carbonara

**Ingredients:**
- 400g spaghetti
- 200g pancetta
- 4 eggs
- Parmesan cheese

**Instructions:**
Cook pasta, fry pancetta, mix with eggs and cheese.
```

### Apple Notes
```
═══ Thai Green Curry ═══

YOU WILL NEED:
• Green curry paste
• Coconut milk
• Chicken
• Thai basil

INSTRUCTIONS:
Simmer curry paste with coconut milk, add chicken, garnish with basil.
```

## Data Storage

All recipes are stored locally in your browser's localStorage. Your data never leaves your device.

To backup your recipes:
1. Click "Export All" → "JSON"
2. Save the file
3. Import it later using "Import" → "JSON"

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## License

Free to use and modify for personal and commercial purposes.
