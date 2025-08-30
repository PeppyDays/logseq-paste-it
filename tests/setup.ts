// Jest setup file

// Skip TextEncoder polyfill - jsdom provides it

// Mock clipboard API
Object.defineProperty(navigator, "clipboard", {
  value: {
    readText: jest.fn(),
    writeText: jest.fn(),
  },
  writable: true,
})

// Mock ClipboardEvent
global.ClipboardEvent = class ClipboardEvent extends Event {
  clipboardData: DataTransfer

  constructor(type: string, options: { clipboardData?: DataTransfer } = {}) {
    super(type)
    this.clipboardData =
      options.clipboardData ||
      ({
        types: [],
        getData: jest.fn(),
        setData: jest.fn(),
      } as any)
  }
}

