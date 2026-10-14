import { saveFile } from './save-file';

describe('saveFile', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should click a download link named after the file, then free its URL', () => {
    vi.useFakeTimers();
    // Not provided by the test DOM (jsdom)
    URL.createObjectURL = vi.fn().mockReturnValue('blob:file-url');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const content = new Blob(['content']);

    saveFile(content, 'vacances.mp4');

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(URL.createObjectURL).toHaveBeenCalledWith(content);
    expect(link.href).toBe('blob:file-url');
    expect(link.download).toBe('vacances.mp4');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:file-url');
  });
});
