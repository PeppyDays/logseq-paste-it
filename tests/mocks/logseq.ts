// Mock LogSeq API for testing
export const logseq = {
  settings: {
    indentHeaders: true,
    newLineBlock: true,
    enablePasteMore: true,
  },

  Editor: {
    getCurrentBlock: jest.fn(),
    insertAtEditingCursor: jest.fn(),
    insertBatchBlock: jest.fn(),
  },

  App: {
    registerUIItem: jest.fn(),
    registerCommandPalette: jest.fn(),
  },

  UI: {
    showMsg: jest.fn(),
  },

  provideModel: jest.fn(),
  provideStyle: jest.fn(),
  updateSettings: jest.fn(),
  useSettingsSchema: jest.fn(() => ({
    ready: jest.fn(() => ({
      catch: jest.fn(),
    })),
  })),
  beforeunload: jest.fn(),
}

// Make it available globally
;(global as any).logseq = logseq

