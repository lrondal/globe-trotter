# Globe trotter

A personal, single-user record of the places someone has visited or wants to visit, centred on a 3D globe. The UI is in French; the terms below are the canonical English names, with the French UI label in parentheses.

## Places

**Place**:
A Country, Island, Region or City that the user can mark, annotate and photograph.
_Avoid_: Location, destination, spot

**Country** (Pays):
A top-level Place, identified by its ISO 3166-1 code. Includes territories drawn separately on the map (e.g. Greenland, Hong Kong), which are marked independently of their sovereign state.
_Avoid_: Nation, state

**Island** (Île):
A part of a Country set apart from its mainland, almost always an island (French Guiana and Alaska are the exceptions), e.g. Crète, Corse, Bali. Islands come from a fixed list; the large islands of archipelago countries (Hokkaido, Java) are not Islands. An Island belongs to its Country but is marked independently of it, both ways: visiting Crète does not make Greece Visited.
_Avoid_: Detached region, territory, part

**Region** (Région):
The administrative subdivision of a Country a traveller names, usually its first level (ADM1), e.g. Hokkaido, Toscana. Where the first level only groups them into statistical macro-regions, the level below is taken: Italy's 20 regioni rather than its 5 NUTS1 groups.
_Avoid_: Province, state, area

**City** (Ville):
A named point Place inside a Country, and inside an Island or a Region when one can be determined. Either picked from the built-in city list or a Custom City.
_Avoid_: Town, pin

**Custom City**:
A City the user created by dropping a point on the globe and naming it, for places missing from the built-in list.
_Avoid_: Custom pin, user place

## Status

**Mark**:
The status the user has set directly on a Place: Visited, Wish, or none.

**Status**:
A Place's effective state, derived from its own Mark and the Marks of the Places inside it. An Island and the Cities on it are not inside their Country or a Region for this. Visited outranks Wish, which outranks Unexplored.

**Visited** (Visité):
The Status of a Place the user has been to.

**Wish** (À visiter):
The Status of a Place the user wants to visit.
_Avoid_: Pin, bookmark, favourite

**Unexplored** (Non exploré):
The Status of a Place with no Visited or Wish Mark on it or inside it. An Unexplored Place can still hold a Note and Photos.

**Visit date**:
The single month-precision date the user associates with having visited a Place. It defaults to the month the Place was marked Visited and can be edited to record an earlier trip; it goes when the Place stops being marked Visited (undoing that change brings it back); a Place without its own Visit date shows the range of the Visit dates inside it.
_Avoid_: Trip, visitedAt

## Content

**Note** (Note):
The single block of free text attached to a Place. Each Place has at most one.
_Avoid_: Entry, journal entry

**Todo** (À faire):
A checklist item attached to a Place.
_Avoid_: Task

**Photo** (Photo):
An image belonging to exactly one Place, shown on the globe at that Place's point: a City's own point, or the pole of inaccessibility of the largest polygon of a Country, Island or Region. A Country, Island or Region also shows the Photos of the Places inside it, without owning them.
_Avoid_: Picture, image, media

**Cover photo**:
The one Photo that represents a Place, on the globe and in its sheet. The user can choose it among the Place's own Photos or those of the Places inside it; failing that, it is the Place's first own Photo, or else the first Photo inside it.

**Caption** (Légende):
The optional one-line text the user writes on a Photo, shown only when the Photo is open full screen.
_Avoid_: Legend, title, description

## Actions

**Clear** (Effacer):
Removing a Country's, Island's or Region's Mark, Note, Todos and Photos, returning it to Unexplored. Places inside it are untouched.
_Avoid_: Delete, reset

**Delete** (Supprimer):
Removing a City together with its Note, Todos and Photos. Only Cities can be deleted.
_Avoid_: Remove, clear

**Export** (Exporter mes voyages):
A single file holding all of the user's Places, content and Photos, which can be imported to restore them. It never holds the user's position.
_Avoid_: Backup, dump

**Import** (Importer un Export):
Replacing everything the app holds with an Export, after the user confirms. The whole file is checked first: one that fails is refused, nothing touched.

**Reset** (Réinitialiser toutes les données):
Deleting, for good and after the user confirms, every Place, Note, Todo and Photo with its files, and the Profile's settings: the app as first installed. Not to be confused with a Clear, which covers one Place.
_Avoid_: Wipe, delete all

## Views

**Journal** (Carnet):
The list of every Place that has a Mark or any content, grouped by Country.
_Avoid_: Notebook, log

**Wishlist** (Envies):
The Plans, as a timeline: « Prochainement » for those with a Planned date in the next twelve months (or gone by), by date; then one group per later year; then « Un jour » for those without one. The user orders the Plans of a year or of « Un jour » by hand. A Place added there from a search of every Place is marked Wish, unless it has a Mark already: a Visited Place stays Visited. A Plan opens its Country page.

**Plan** (Projet):
A Country holding a Place marked Wish: itself, or one of its Regions, Islands or Cities. It gathers them, with its Planned date and its Itinerary. A Plan covers a single Country.
_Avoid_: Trip, project, journey

**Planned date** (Date prévue):
The single month-precision date a Plan is meant for, or none (« Un jour »). It goes when the Country is marked Visited, its Visit date then taking it (or the current month, if the Planned date is still to come), and when the Country stops being a Plan; undoing that change brings it back.
_Avoid_: Trip date, due date

**Itinerary** (Itinéraire):
The order the user gives the Regions, Islands and Cities marked Wish of a Plan, its stops; a Place newly marked Wish goes last. The Country page lists them in that order too.
_Avoid_: Route, steps

**Country page** (page Pays):
A Country's own page, opened from the Journal or the Wishlist: its Regions and Islands with a Mark or content, or holding a City with one, each with those Cities, and its other such Cities under « Autres villes ». A Place added there from a search of that Country is marked Wish, unless it has a Mark already.
_Avoid_: Country detail, country view
