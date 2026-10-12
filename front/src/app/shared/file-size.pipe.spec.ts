import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  const pipe = new FileSizePipe();

  it('should keep a small size in bytes', () => {
    expect(pipe.transform(500)).toBe('500 o');
  });

  it('should switch unit every 1024 and keep one decimal, French style', () => {
    expect(pipe.transform(1536)).toBe('1,5 Ko');
    expect(pipe.transform(2726297)).toBe('2,6 Mo');
    expect(pipe.transform(1024 ** 3)).toBe('1 Go');
  });

  it('should stay in Go beyond the last unit', () => {
    // French thousands separator: a narrow no-break space
    expect(pipe.transform(3 * 1024 ** 4)).toBe('3\u202f072 Go');
  });
});
