// native modules do not run in Jest (Node): each one is replaced by a version that works on a computer

jest.mock('~/lib/db', () => jest.requireActual('./db'))

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-crypto', () => ({
  randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID(),
}))

// step sources (src/lib/steps.*.ts): each test sets what the phone answers
jest.mock('expo-sensors', () => ({
  Pedometer: {
    // same values as the PermissionStatus enum of expo
    PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
    isAvailableAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getStepCountAsync: jest.fn(),
  },
}))

jest.mock('react-native-health-connect', () => ({
  // same values as the library's constants
  SdkAvailabilityStatus: {
    SDK_UNAVAILABLE: 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2,
    SDK_AVAILABLE: 3,
  },
  getSdkStatus: jest.fn(),
  initialize: jest.fn(),
  getGrantedPermissions: jest.fn(),
  requestPermission: jest.fn(),
  aggregateRecord: jest.fn(),
}))
