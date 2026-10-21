// The Region outlines (assets/regions/*.geo) and the Cities (assets/data/cities.tsv) are
// bundled as files, not as JS: the JS bundle would otherwise carry every Country's Regions
// (17 MB in the prototype, #2) and 170,000 Cities.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('geo', 'tsv');

module.exports = config;
