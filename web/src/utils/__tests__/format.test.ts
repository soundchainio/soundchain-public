import { currency } from '../format'

describe('format.currency', () => {
  it('returns the right currency', () => {
    expect(currency(1000.01)).toBe('$1,000.01')
    expect(currency(1000.019)).toBe('$1,000.02')
    expect(currency(10)).toBe('$10.00')
    expect(currency(1)).toBe('$1.00')
    expect(currency(1.49)).toBe('$1.49')
    expect(currency(1.499)).toBe('$1.50')
    expect(currency(0.499)).toBe('$0.50')
    expect(currency(0.4999)).toBe('$0.50')
    expect(currency(0.0499)).toBe('$0.05')
    expect(currency(0.004999)).toBe('$0.005')
    expect(currency(0.0004999)).toBe('$0.0005')
  })
})
