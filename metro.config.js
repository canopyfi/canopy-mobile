const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Polyfill node core modules
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-get-random-values'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
};

module.exports = config;
