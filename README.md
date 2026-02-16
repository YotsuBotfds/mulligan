# Zero to Hero Survival Compendium

A comprehensive offline-first Progressive Web App containing 260+ survival and civilization-rebuilding guides, interactive tools, and reference materials. Designed to work entirely without internet access once installed.

## Features

- **260+ Detailed Guides** covering survival, agriculture, medicine, engineering, craftsmanship, and more
- **6 Interactive Tools**: Tech Tree, Learning Paths, Combo Projects, Quick Reference Cards, Skill Assessments, Visual Diagrams
- **Offline-First PWA**: Install on any device, works without internet
- **Progress Tracking**: Mark guides as read, earn achievements
- **Dark/Light Theme**: Toggle between themes for comfortable reading
- **Search**: Quick search across all guides by title, description, and tags
- **Data Import/Export**: Back up and restore your progress

## Installation as PWA

1. Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari)
2. Click the browser's "Install" or "Add to Home Screen" prompt
3. The app will be available offline from your home screen/app drawer

## Running Locally

```bash
# Serve with any static HTTP server:
npx serve .
# or
python3 -m http.server 8000
```

## Project Structure

```
├── index.html              # Main app shell with guide cards
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for offline caching
├── build.sh                # Build/maintenance script
├── package.json            # Project metadata and scripts
├── css/
│   └── main.css            # Global styles (minified)
├── js/
│   └── app.js              # Main application logic
├── guides/                 # 260+ HTML guide files
├── data/
│   ├── guides.json         # Guide metadata (titles, categories, tags)
│   ├── skills_merged.json  # Skill definitions and relationships
│   ├── master-skills-db.json # Skill hierarchy
│   └── salvage_data.json   # Salvageable materials database
├── tools/                  # 6 interactive tool pages
├── shared/                 # Shared CSS and JS for guide pages
├── spreadsheets/           # 9 reference spreadsheets (xlsx)
├── assets/                 # Icons and images
└── docs/                   # Documentation
```

## Adding a New Guide

1. Create a new HTML file in `guides/` following the existing format
2. Add an entry to `data/guides.json` with title, category, tags, and description
3. Run `npm run build` to update the service worker cache

## Contributing

Contributions are welcome! Please ensure:
- New guides follow the standard HTML template
- All guides have corresponding entries in `guides.json`
- Run `npm run build` before submitting to validate the project

## License

MIT
