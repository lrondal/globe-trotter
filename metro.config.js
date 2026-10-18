// The Region outlines (assets/regions/*.geo) are bundled as files, not as JS: the JS bundle
// would otherwise carry every Country's Regions (17 MB in the prototype, #2).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('geo');

module.exports = config;
