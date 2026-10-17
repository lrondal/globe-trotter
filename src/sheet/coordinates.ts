/** "36.20° N · 138.25° E", with the French O (ouest) for west. */
export function formatCoordinates(lon: number, lat: number) {
  const lonText = `${Math.abs(lon).toFixed(2)}° ${lon < 0 ? 'O' : 'E'}`;
  const latText = `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? 'S' : 'N'}`;
  return `${latText} · ${lonText}`;
}
