import { isEmailValid, isFirstNameValid, isPasswordValid } from '~/lib/account'

describe('isFirstNameValid', () => {
  it('accepts a first name and refuses an empty or blank one', () => {
    expect(isFirstNameValid('Camille')).toBe(true)
    expect(isFirstNameValid('')).toBe(false)
    expect(isFirstNameValid('   ')).toBe(false)
  })
})

describe('isEmailValid', () => {
  it.each(['camille@exemple.fr', ' camille@exemple.fr ', 'c.b+test@mail.co.uk'])('accepts "%s"', (email) => {
    expect(isEmailValid(email)).toBe(true)
  })

  it.each(['', 'camille', 'camille@', 'camille@exemple', '@exemple.fr', 'cam ille@exemple.fr'])('refuses "%s"', (email) => {
    expect(isEmailValid(email)).toBe(false)
  })
})

describe('isPasswordValid', () => {
  it('needs 8 characters: 7 is refused, 8 and 9 are accepted', () => {
    expect(isPasswordValid('1234567')).toBe(false)
    expect(isPasswordValid('12345678')).toBe(true)
    expect(isPasswordValid('123456789')).toBe(true)
  })

  it('counts an emoji as one character', () => {
    expect(isPasswordValid('🙂🙂🙂🙂🙂🙂🙂')).toBe(false)
    expect(isPasswordValid('🙂🙂🙂🙂🙂🙂🙂🙂')).toBe(true)
  })
})
