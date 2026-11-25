// native modules do not run in Jest (Node): each one is replaced by a version that works on a computer

jest.mock('~/lib/db', () => jest.requireActual('./db'))

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}))
