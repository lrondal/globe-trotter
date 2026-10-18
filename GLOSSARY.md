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
A first-level administrative subdivision of a Country (ADM1), e.g. Kansai, Toscane.
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
An image belonging to exactly one Place, shown on the globe at that Place's point.
_Avoid_: Picture, image, media

**Cover photo**:
The one Photo a Place has chosen to represent it.

## Actions

**Clear** (Effacer):
Removing a Country's, Island's or Region's Mark, Note, Todos and Photos, returning it to Unexplored. Places inside it are untouched.
_Avoid_: Delete, reset

**Delete** (Supprimer):
Removing a City together with its Note, Todos and Photos. Only Cities can be deleted.
_Avoid_: Remove, clear

**Export** (Exporter mes voyages):
A single file holding all of the user's Places, content and Photos, which can be imported to restore them.
_Avoid_: Backup, dump

## Views

**Journal** (Carnet):
The list of every Place that has a Mark or any content, grouped by Country.
_Avoid_: Notebook, log

**Wishlist** (Envies):
The list of every Place whose Mark is Wish.
