// module.exports = function(api) {
//   api.cache(true);
//   return {
//     presets: ['babel-preset-expo'],
//     plugins: [
//       // Required for expo-router
//       'expo-router/babel',
//       // Required for reanimated
//       'react-native-reanimated/plugin',
//       // Required for environment variables
//       ['module:react-native-dotenv', {
//         moduleName: '@env',
//         path: '.env',
//         blocklist: null,
//         allowlist: null,
//         safe: false,
//         allowUndefined: true,
//       }]
//     ]
//   };
// };



module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router
      // require.resolve('expo-router/babel'),
      // Required for reanimated
      'react-native-reanimated/plugin',
      // Required for environment variables
      // ['module:react-native-dotenv', {
      //   moduleName: '@env',
      //   path: '.env',
      //   blocklist: null,
      //   allowlist: null,
      //   safe: false,
      //   allowUndefined: true,
      // }]
    ]
  };
};