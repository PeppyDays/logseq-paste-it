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

// Mock ClipboardEvent with proper TypeScript compliance
global.ClipboardEvent = class ClipboardEvent extends Event {
  clipboardData: DataTransfer

  constructor(type: string, eventInitDict?: ClipboardEventInit) {
    super(type, eventInitDict)
    this.clipboardData =
      eventInitDict?.clipboardData ||
      ({
        types: [],
        getData: jest.fn(),
        setData: jest.fn(),
      } as any)
  }
} as any
