const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo Router relies on Metro require.context to discover app/ routes in release bundles.
config.transformer.unstable_allowRequireContext = true;

// Firebase requires explicit cjs and mjs resolution sometimes
config.resolver.sourceExts.push('cjs');
config.resolver.sourceExts.push('mjs');

module.exports = config;
