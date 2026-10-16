# Globe trotter — App mobile (iOS)

Interactive click-through of the mobile app, built only from design-system components.

Screens:
- **Globe** (`GlobeScreen.jsx`): 3D globe, search, status filter chips, recenter and zoom buttons. Tap a country to open its sheet and show its regions.
- **Fiche pays** (`PlaceSheet.jsx`): bottom sheet with status, cover photo, quote from the note, cities or regions, and actions (Marquer visité, À visiter).
- **Carnet de lieu** (`NoteScreen.jsx`): place note with photo, editable text, checklist, photo grid, and delete confirmation.
- **Carnet / Envies / Profil** (`ListScreens.jsx`): note list grouped by country, pinned destinations (tap to fly to them on the globe), and settings.

Data: `data.js`. Countries use ISO 3166-1 numeric ids.

Limitations: the 110m world dataset only has country borders, so "Régions" changes the sheet list but not the globe drawing. Photos are hatched placeholders until real images are added.
