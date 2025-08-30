/**
 * Enhanced test utilities for paste-it plugin
 * Provides focused, reusable test helpers
 */

import { PluginSettings, BlockContent } from "../../public/types"

/**
 * Test data factory for creating consistent test fixtures
 */
export class TestDataFactory {
  /**
   * Create mock clipboard event with HTML content
   */
  static createClipboardEvent(
    html: string,
    plainText?: string,
  ): ClipboardEvent {
    const mockClipboardData = {
      types: plainText ? ["text/html", "text/plain"] : ["text/html"],
      getData: jest.fn((type: string) => {
        if (type === "text/html") return html
        if (type === "text/plain") return plainText || ""
        return ""
      }),
    }

    return new ClipboardEvent("paste", {
      clipboardData: mockClipboardData as any,
    })
  }

  /**
   * Create mock clipboard event for file drops
   */
  static createFileDropEvent(): ClipboardEvent {
    const mockClipboardData = {
      types: ["Files"],
      getData: jest.fn(() => ""),
    }

    return new ClipboardEvent("paste", {
      clipboardData: mockClipboardData as any,
    })
  }

  /**
   * Create mock plugin settings
   */
  static createMockSettings(
    overrides: Partial<PluginSettings> = {},
  ): PluginSettings {
    return {
      indentHeaders: true,
      newLineBlock: true,
      removeHeaders: false,
      removeBolds: false,
      removeHorizontalRules: false,
      removeEmojis: false,
      ...overrides,
    }
  }

  /**
   * Create mock block content
   */
  static createMockBlock(content: string, uuid?: string): BlockContent {
    return {
      content,
      children: [],
      uuid: uuid || "mock-uuid-123",
    }
  }
}

/**
 * Content validation utilities
 */
export class ContentValidator {
  /**
   * Validate markdown header syntax
   */
  static isValidHeader(text: string): boolean {
    return /^#{1,6}\s+.+/.test(text)
  }

  /**
   * Validate code block syntax
   */
  static isValidCodeBlock(text: string): boolean {
    return /^```[\w]*\n[\s\S]*?\n```$/.test(text)
  }

  /**
   * Validate table syntax
   */
  static isValidTable(text: string): boolean {
    const lines = text.split("\n")
    return lines.every((line) => /^\|.*\|$/.test(line.trim()))
  }

  /**
   * Check if content has LogSeq internal markers
   */
  static hasInternalMarkers(html: string): boolean {
    const internalSign = "<meta charset='utf-8'><ul><placeholder>"
    const directiveMarker = "<!-- directives: [] -->"

    return html.includes(internalSign) || html.includes(directiveMarker)
  }

  /**
   * Check if content has Google Docs formatting
   */
  static hasGoogleDocsFormat(markdown: string): boolean {
    return (
      markdown.length > 6 &&
      markdown.slice(0, 3) === "**\n" &&
      markdown.slice(markdown.length - 3) === "\n**"
    )
  }
}

/**
 * Block structure validation utilities
 */
export class BlockValidator {
  /**
   * Validate block structure properties
   */
  static validateBlockStructure(block: BlockContent): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (typeof block.content !== "string") {
      errors.push("Block content must be a string")
    }

    if (!Array.isArray(block.children)) {
      errors.push("Block children must be an array")
    }

    if (block.uuid && typeof block.uuid !== "string") {
      errors.push("Block UUID must be a string if present")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate hierarchy consistency
   */
  static validateHierarchy(blocks: BlockContent[]): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    blocks.forEach((block, index) => {
      const validation = this.validateBlockStructure(block)
      if (!validation.isValid) {
        issues.push(`Block ${index}: ${validation.errors.join(", ")}`)
      }

      // Recursively validate children
      if (block.children && block.children.length > 0) {
        const childValidation = this.validateHierarchy(block.children)
        if (!childValidation.isValid) {
          issues.push(
            `Block ${index} children: ${childValidation.issues.join(", ")}`,
          )
        }
      }
    })

    return {
      isValid: issues.length === 0,
      issues,
    }
  }
}

/**
 * Test assertion helpers
 */
export class TestAssertions {
  /**
   * Assert that blocks have expected structure
   */
  static expectBlockStructure(
    blocks: BlockContent[],
    expectedCount: number,
    hasChildren?: boolean,
  ): void {
    expect(blocks).toHaveLength(expectedCount)

    blocks.forEach((block) => {
      expect(block).toHaveProperty("content")
      expect(block).toHaveProperty("children")
      expect(Array.isArray(block.children)).toBe(true)

      if (hasChildren !== undefined) {
        expect(block.children!.length > 0).toBe(hasChildren)
      }
    })
  }

  /**
   * Assert that content matches expected patterns
   */
  static expectContentPattern(
    blocks: BlockContent[],
    pattern: RegExp,
    shouldMatch: boolean = true,
  ): void {
    const hasMatch = blocks.some((block) => pattern.test(block.content))
    expect(hasMatch).toBe(shouldMatch)
  }

  /**
   * Assert header removal was applied correctly
   */
  static expectHeadersRemoved(blocks: BlockContent[]): void {
    blocks.forEach((block) => {
      expect(block.content).not.toMatch(/^#{1,6}\s/)

      // Check children recursively
      if (block.children) {
        this.expectHeadersRemoved(block.children)
      }
    })
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure function execution time
   */
  static async measureTime<T>(fn: () => Promise<T> | T): Promise<{
    result: T
    timeMs: number
  }> {
    const start = performance.now()
    const result = await fn()
    const timeMs = performance.now() - start

    return { result, timeMs }
  }

  /**
   * Generate large test content
   */
  static generateLargeContent(sizeKB: number): string {
    const targetLength = sizeKB * 1024
    const baseContent =
      "# Header\nSome content with **bold** text and [links](http://example.com)\n"

    let content = ""
    while (content.length < targetLength) {
      content += baseContent
    }

    return content.slice(0, targetLength)
  }
}

/**
 * Mock factory for LogSeq API
 */
export class LogSeqMockFactory {
  /**
   * Create comprehensive LogSeq mock
   */
  static createMockLogSeq(
    settings: PluginSettings = TestDataFactory.createMockSettings(),
  ) {
    return {
      settings,
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
  }
}
