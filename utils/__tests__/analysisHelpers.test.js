import {
  extractTickers,
  inferTradeIntent,
  isSpamTweet,
  formatDate,
  getNextTradingDay,
  calculateReturn,
  determineOutcome,
  determineHitOrMiss,
} from '../analysisHelpers';

describe('extractTickers', () => {
  test('extracts single ticker', () => {
    const text = 'Just bought $AAPL today!';
    expect(extractTickers(text)).toEqual(['AAPL']);
  });

  test('extracts multiple tickers', () => {
    const text = 'Long $TSLA and $NVDA, shorting $AMD';
    expect(extractTickers(text)).toEqual(['TSLA', 'NVDA', 'AMD']);
  });

  test('deduplicates tickers', () => {
    const text = 'Bought more $AAPL. $AAPL is my largest position';
    expect(extractTickers(text)).toEqual(['AAPL']);
  });

  test('filters out currency symbols', () => {
    const text = 'Market cap in $USD is huge, buying $AAPL';
    expect(extractTickers(text)).toEqual(['AAPL']);
  });

  test('filters out common abbreviations', () => {
    const text = '$CEO announces $IPO for $TSLA';
    expect(extractTickers(text)).toEqual(['TSLA']);
  });

  test('handles tickers at start/end of text', () => {
    const text = '$MSFT is strong today $GOOGL';
    expect(extractTickers(text)).toEqual(['MSFT', 'GOOGL']);
  });

  test('rejects >5 character symbols', () => {
    const text = '$TOOLONG $TSLA';
    expect(extractTickers(text)).toEqual(['TSLA']);
  });

  test('handles empty text', () => {
    expect(extractTickers('')).toEqual([]);
    expect(extractTickers(null)).toEqual([]);
    expect(extractTickers(undefined)).toEqual([]);
  });

  test('handles text without tickers', () => {
    const text = 'Market is looking good today';
    expect(extractTickers(text)).toEqual([]);
  });
});

describe('inferTradeIntent', () => {
  test('detects bullish buy intent', () => {
    const text = 'Buying $AAPL here, looks bullish';
    expect(inferTradeIntent(text)).toEqual({ type: 'Buy', direction: 'Long' });
  });

  test('detects bearish sell intent', () => {
    const text = 'Selling $TSLA, looks bearish';
    expect(inferTradeIntent(text)).toEqual({ type: 'Sell', direction: 'Long' });
  });

  test('detects short position', () => {
    const text = 'Shorting $AMD here, downside ahead';
    expect(inferTradeIntent(text)).toEqual({ type: 'Sell', direction: 'Short' });
  });

  test('detects accumulate as buy', () => {
    const text = 'Accumulating $NVDA on weakness';
    expect(inferTradeIntent(text)).toEqual({ type: 'Buy', direction: 'Long' });
  });

  test('detects hold/neutral intent', () => {
    const text = 'Holding $MSFT, watching for breakout';
    expect(inferTradeIntent(text)).toEqual({ type: 'Hold', direction: 'Long' });
  });

  test('defaults to hold for ambiguous text', () => {
    const text = '$AAPL trading at $150';
    expect(inferTradeIntent(text)).toEqual({ type: 'Hold', direction: 'Long' });
  });

  test('handles mixed sentiment - bearish wins', () => {
    const text = 'Was bullish but now selling $TSLA';
    expect(inferTradeIntent(text)).toEqual({ type: 'Sell', direction: 'Long' });
  });

  test('handles empty text', () => {
    expect(inferTradeIntent('')).toEqual({ type: 'Hold', direction: 'Long' });
    expect(inferTradeIntent(null)).toEqual({ type: 'Hold', direction: 'Long' });
  });

  test('case insensitive matching', () => {
    const text = 'BUYING $AAPL TODAY';
    expect(inferTradeIntent(text)).toEqual({ type: 'Buy', direction: 'Long' });
  });
});

describe('isSpamTweet', () => {
  test('detects spam with many tickers', () => {
    const tickers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    expect(isSpamTweet(tickers)).toBe(true);
  });

  test('allows normal tweets', () => {
    const tickers = ['AAPL', 'TSLA', 'NVDA'];
    expect(isSpamTweet(tickers)).toBe(false);
  });

  test('respects custom threshold', () => {
    const tickers = ['A', 'B', 'C'];
    expect(isSpamTweet(tickers, 2)).toBe(true);
    expect(isSpamTweet(tickers, 5)).toBe(false);
  });
});

describe('formatDate', () => {
  test('formats Date object', () => {
    const date = new Date('2025-01-15T10:30:00Z');
    expect(formatDate(date)).toBe('2025-01-15');
  });

  test('formats ISO string', () => {
    expect(formatDate('2025-01-15T10:30:00Z')).toBe('2025-01-15');
  });

  test('pads single digits', () => {
    const date = new Date('2025-03-05T10:30:00Z');
    expect(formatDate(date)).toBe('2025-03-05');
  });
});

describe('getNextTradingDay', () => {
  test('returns same day for weekday', () => {
    const monday = new Date('2025-01-13T10:00:00Z'); // Monday
    const result = getNextTradingDay(monday);
    expect(result.getDay()).toBe(1); // Still Monday
  });

  test('skips Saturday to Monday', () => {
    const saturday = new Date('2025-01-18T10:00:00Z'); // Saturday
    const result = getNextTradingDay(saturday);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(20);
  });

  test('skips Sunday to Monday', () => {
    const sunday = new Date('2025-01-19T10:00:00Z'); // Sunday
    const result = getNextTradingDay(sunday);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(20);
  });
});

describe('calculateReturn', () => {
  test('calculates positive return', () => {
    expect(calculateReturn(100, 120)).toBeCloseTo(20, 1);
  });

  test('calculates negative return', () => {
    expect(calculateReturn(100, 80)).toBeCloseTo(-20, 1);
  });

  test('calculates zero return', () => {
    expect(calculateReturn(100, 100)).toBe(0);
  });

  test('handles zero entry price', () => {
    expect(calculateReturn(0, 100)).toBe(0);
  });

  test('handles null entry price', () => {
    expect(calculateReturn(null, 100)).toBe(0);
  });
});

describe('determineOutcome', () => {
  test('returns Win for positive return', () => {
    expect(determineOutcome(15.5)).toBe('Win');
  });

  test('returns Loss for negative return', () => {
    expect(determineOutcome(-10.2)).toBe('Loss');
  });

  test('returns Loss for zero return', () => {
    expect(determineOutcome(0)).toBe('Loss');
  });
});

describe('determineHitOrMiss', () => {
  test('returns Hit for positive alpha', () => {
    expect(determineHitOrMiss(5.2)).toBe('Hit');
  });

  test('returns Miss for negative alpha', () => {
    expect(determineHitOrMiss(-3.1)).toBe('Miss');
  });

  test('returns Miss for zero alpha', () => {
    expect(determineHitOrMiss(0)).toBe('Miss');
  });
});
