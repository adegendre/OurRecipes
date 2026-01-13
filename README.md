# Our Recipes

A simple web application for managing and sharing our family recipes. Browse recipes publicly, but only authenticated users can add, edit, or delete recipes.

**Live App:** [https://adegendre.github.io/OurRecipes/](https://adegendre.github.io/OurRecipes/)

## Features

### Public Recipe Browsing
- **No login required** to view and search recipes
- Beautiful, responsive interface with warm, inviting design
- Smart search across recipe titles, ingredients, and categories
- Advanced filtering by tags (type, region, meal, source)
- Similar recipe suggestions based on shared ingredients
- Wake lock support to keep screen on while cooking

### Secure Recipe Management
- **Authentication required** for adding, editing, or deleting recipes
- Firebase Authentication with email/password
- Login modal appears seamlessly when modification is attempted
- Sign out button for authenticated users

### Flexible Import/Export
Import recipes from multiple formats:
- **JSON** - Structured recipe data
- **Plain Text** - Simple, natural format
- **Markdown** - With headers and formatting
- **Apple Notes** - Direct copy-paste support

Export your collection to:
- **JSON** - For backup and migration
- **Markdown** - For documentation
- **Rich Text Format (RTF)** - For printing or sharing

### Smart Organization
- **Categories**: Breakfast, Main, Dessert, Soup, Salad, Snack, Drink
- **Tag System**:
  - **Type**: spicy, comfort, quick, few ingredients, overnight, etc.
  - **Region**: Asia, France, Latin America, Italy, Middle East, etc.
  - **Meal**: brekkie, lunch/dinner, snack, dessert
  - **Source**: Ottolenghi, Jamie Oliver, family recipes, etc.

### Real-time Sync
- Cloud storage with Firebase Firestore
- Changes sync automatically across all your devices
- Share access with family members

### Security Features
- Firebase App Check with reCAPTCHA v3 (bot protection)
- Firestore security rules (read public, write authenticated)
- Private GitHub repository
- No exposed credentials in public code

## Quick Start

### For Users

1. Visit [https://adegendre.github.io/OurRecipes/](https://adegendre.github.io/OurRecipes/)
2. Browse recipes without logging in
3. Click "Add Recipe" or "Manage" to create an account
4. Start adding your recipes!

### Creating Your Account

1. Click any "Add" or "Manage" button
2. A login modal will appear
3. Click "Create one" to switch to signup
4. Enter your email and password (minimum 6 characters)
5. Click "Create Account"

## Import Format Examples

### Plain Text Format
```
Chocolate Chip Cookies

Ingredients:
- 2 cups flour
- 1 cup butter
- 1 cup sugar
- 2 eggs
- 1 cup chocolate chips

Instructions:
Preheat oven to 350°F. Mix dry ingredients, cream butter and sugar,
add eggs, combine, fold in chocolate chips. Bake for 12 minutes.

Notes: Best served warm with milk
```

### Markdown Format
```markdown
## Spaghetti Carbonara

**Type:** comfort, quick
**Region:** Italy

**Ingredients:**
- 400g spaghetti
- 200g pancetta
- 4 eggs
- 100g Parmesan cheese
- Black pepper

**Instructions:**
Cook pasta. Fry pancetta until crispy. Mix eggs and Parmesan.
Combine hot pasta with pancetta, remove from heat, add egg mixture.
Toss quickly. Season with black pepper.
```

### Apple Notes Format
```
═══════════════════
Thai Green Curry
═══════════════════

YOU WILL NEED:
• 2 tbsp green curry paste
• 400ml coconut milk
• 500g chicken breast
• Thai basil
• Fish sauce

INSTRUCTIONS:
Fry curry paste, add coconut milk, simmer. Add chicken and cook through.
Finish with basil and fish sauce.

Note: Serve with jasmine rice
```

## Data Management

### Backup Your Recipes
1. Click the manage button (gear icon)
2. Select "Export All" → "JSON"
3. Save the file to your computer

### Import Recipes
1. Click "Import" in the manage menu
2. Choose your file (JSON, TXT, MD)
3. Or use "Import from Text" to paste directly

### Restore from Backup
1. Import your JSON backup file
2. All recipes will be restored to Firestore

## Technology Stack

- **Frontend**: React 18 (via CDN, no build step)
- **Styling**: Inline styles with warm beige color palette
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Security**: Firebase App Check with reCAPTCHA v3
- **Hosting**: GitHub Pages
- **Fonts**: Playfair Display (headings), Source Sans 3 (body)

## Security & Privacy

- **Public Viewing**: Anyone can browse recipes without authentication
- **Authenticated Editing**: Only logged-in users can add/edit/delete recipes
- **Firebase Security Rules**: Enforced at the database level
- **App Check**: Prevents unauthorized apps from accessing Firebase
- **reCAPTCHA v3**: Protects against bots and abuse
- **Private Repository**: Source code not publicly accessible

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Fully responsive

## Mobile Experience

- Fully responsive design
- Touch-friendly interface
- Wake lock support (keeps screen on while viewing recipes)
- Works on iOS and Android

## Multi-User Access

Multiple users can create accounts and share the same recipe database:
- Each user has their own login credentials
- All users see the same recipes
- Changes made by any user are visible to everyone
- Perfect for couples or families

## Future Enhancements

Potential features for future development:
- Recipe rating system
- Photo upload for recipes
- Meal planning calendar
- Shopping list generation
- Recipe sharing via link
- Print-friendly recipe cards
- Nutritional information

## License

Free to use and modify for personal and commercial purposes.

## Acknowledgments

Built with Claude Code and powered by:
- React
- Firebase
- Google Fonts
- reCAPTCHA

---

**Enjoy cooking!**
