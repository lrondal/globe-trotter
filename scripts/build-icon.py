"""Draws the app icon: a small terracotta globe, from the real coastlines in assets/data/countries.json.

Run from the repo root (needs Pillow and numpy):  python scripts/build-icon.py
Writes icon.png, splash-icon.png, favicon.png and the three Android adaptive-icon layers into assets/images.
"""

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"
COORD_SCALE = 1e4  # src/atlas/countries.ts

# Design-system tokens (src/theme/tokens.ts)
PAPER_1 = (0xF4, 0xF1, 0xEA)
TERRACOTTA_500 = (0xC4, 0x57, 0x2E)
TERRACOTTA_700 = (0x8A, 0x38, 0x16)
OCHRE_400 = (0xE9, 0xC4, 0x8F)

# Globe view: Europe and Africa facing, tilted north a little.
CENTER_LON, CENTER_LAT = 12.0, 24.0
SS = 4  # supersampling for anti-aliasing


def load_land_mask(width=4096):
    """Equirectangular land mask (True = land), drawn from the country polygons."""
    data = json.loads((ROOT / "assets" / "data" / "countries.json").read_text(encoding="utf8"))
    arcs = []
    for flat in data["arcs"]:
        lon = lat = 0
        pts = []
        for i in range(0, len(flat), 3):
            lon += flat[i]
            lat += flat[i + 1]
            pts.append((lon / COORD_SCALE, lat / COORD_SCALE))
        arcs.append(pts)

    def ring(indices):
        pts = []
        for i in indices:
            arc = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(arc[1:] if pts else arc)
        return pts

    def unwrap(pts):
        """Continuous longitudes across the antimeridian; rings that circle a pole are closed through it."""
        out = [pts[0]]
        for lon, lat in pts[1:]:
            prev = out[-1][0]
            lon += 360 * round((prev - lon) / 360)
            out.append((lon, lat))
        drift = out[-1][0] - out[0][0]
        if abs(drift) > 180:  # goes all the way round: close via the pole on its side
            pole = 90 if sum(lat for _, lat in out) > 0 else -90
            out += [(out[-1][0], pole), (out[0][0], pole)]
        return out

    height = width // 2
    img = Image.new("1", (width, height), 0)
    draw = ImageDraw.Draw(img)
    to_px = lambda lon, lat: ((lon + 180) / 360 * width, (90 - lat) / 180 * height)

    def fill(pts, value):
        pts = unwrap(pts)
        for shift in (-360, 0, 360):
            draw.polygon([to_px(lon + shift, lat) for lon, lat in pts], fill=value)

    for country in data["countries"]:
        for polygon in country["polygons"]:
            outer, *holes = polygon
            fill(ring(outer), 1)
            for hole in holes:
                fill(ring(hole), 0)
    return np.array(img, dtype=bool)


def render_globe(size, diameter, land_mask, *, ocean, land, grid, rim, rim_w=0.022):
    """RGBA image of `size` px with a globe of `diameter` px centred in it."""
    n = size * SS
    r = diameter * SS / 2
    c = n / 2
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float64)
    x = (xs + 0.5 - c) / r
    y = (c - ys - 0.5) / r
    rho2 = x * x + y * y
    inside = rho2 <= 1.0
    z = np.sqrt(np.clip(1 - rho2, 0, 1))

    # Inverse orthographic projection
    φ0, λ0 = math.radians(CENTER_LAT), math.radians(CENTER_LON)
    lat = np.arcsin(np.clip(z * math.sin(φ0) + y * math.cos(φ0), -1, 1))
    lon = λ0 + np.arctan2(x, z * math.cos(φ0) - y * math.sin(φ0))
    lat_d = np.degrees(lat)
    lon_d = (np.degrees(lon) + 180) % 360 - 180

    h, w = land_mask.shape
    mi = np.clip(((90 - lat_d) / 180 * h).astype(int), 0, h - 1)
    mj = np.clip(((lon_d + 180) / 360 * w).astype(int), 0, w - 1)
    is_land = land_mask[mi, mj] & inside

    # Graticule every 30°, lines of constant on-screen width
    px_per_deg = r * math.pi / 180  # supersampled pixels per degree at the centre
    line = max(1.5 * size / 1024, 0.6) * SS / px_per_deg  # half-width, in degrees
    near = lambda v: np.abs((v + 15) % 30 - 15)
    foreshort = np.maximum(z, 0.25)
    on_grid = inside & ~is_land & (
        (near(lat_d) < line / foreshort) | (near(lon_d) < line / foreshort / np.maximum(np.cos(lat), 0.15))
    )

    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[inside] = (*ocean, 255)
    rgba[on_grid] = (*grid, 255)
    rgba[is_land] = (*land, 255)
    if rim is not None:
        on_rim = inside & (np.sqrt(rho2) > 1 - rim_w)
        rgba[on_rim] = (*rim, 255)
    return Image.fromarray(rgba).resize((size, size), Image.LANCZOS)


def on_background(globe, color):
    bg = Image.new("RGBA", globe.size, (*color, 255))
    bg.alpha_composite(globe)
    return bg.convert("RGB")


def main():
    land = load_land_mask()
    colors = dict(ocean=TERRACOTTA_500, land=OCHRE_400, grid=(0xCF, 0x6E, 0x48), rim=TERRACOTTA_700)

    # iOS / default icon: opaque, globe on paper
    on_background(render_globe(1024, 700, land, **colors), PAPER_1).save(OUT / "icon.png")
    # Splash: transparent, shown on the paper splash background
    render_globe(1024, 1000, land, **colors).save(OUT / "splash-icon.png")
    # Web favicon
    on_background(render_globe(48, 44, land, **colors), PAPER_1).save(OUT / "favicon.png")

    # Android adaptive icon: 108dp canvas, keep the globe inside the 66dp safe circle
    render_globe(1024, 600, land, **colors).save(OUT / "android-icon-foreground.png")
    Image.new("RGBA", (1024, 1024), (*PAPER_1, 255)).save(OUT / "android-icon-background.png")
    # Monochrome (themed icons): only alpha matters — continents inside a ring
    white, clear = (255, 255, 255), (0, 0, 0)
    mono = render_globe(1024, 600, land, ocean=clear, land=white, grid=clear, rim=white, rim_w=0.05)
    arr = np.array(mono)
    arr[..., 3] = (arr[..., 3].astype(np.float32) * (arr[..., 0].astype(np.float32) / 255)).astype(np.uint8)
    arr[..., :3] = 255
    Image.fromarray(arr).save(OUT / "android-icon-monochrome.png")


if __name__ == "__main__":
    main()
