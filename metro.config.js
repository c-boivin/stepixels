const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// drizzle-kit migrations are .sql files bundled with the app
config.resolver.sourceExts.push('sql')

module.exports = config
