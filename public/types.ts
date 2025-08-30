/**
 * Type definitions for LogSeq paste-it plugin
 * Comprehensive typing for better maintainability
 */

import { IBatchBlock, SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user"

/**
 * Plugin settings configuration
 */
export interface PluginSettings {
  indentHeaders?: boolean
  newLineBlock?: boolean
  removeHeaders?: boolean
  removeBolds?: boolean
  removeHorizontalRules?: boolean
  removeEmojis?: boolean
}

/**
 * Block content structure
 */
export interface BlockContent extends IBatchBlock {
  content: string
  children?: BlockContent[]
  uuid?: string
}

/**
 * Plugin configuration constants
 */
export const PLUGIN_CONSTANTS = {
  MAX_CONTENT_SIZE: 1_000_000,
  MIN_EXTERNAL_CONTENT_LENGTH: 45,
  INTERNAL_SIGN: "<meta charset='utf-8'><ul><placeholder>",
  DIRECTIVE_MARKER: "<!-- directives: [] -->",
  DIRECTIVE_MARKER_OFFSET: 22,
  MIN_GOOGLE_DOCS_LENGTH: 6,
  GOOGLE_DOCS_PREFIX: "**\n",
  GOOGLE_DOCS_SUFFIX: "\n**",
} as const

/**
 * Error types for better error handling
 */
export class PasteItError extends Error {
  constructor(
    message: string,
    public readonly code: PasteItErrorCode,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = "PasteItError"
  }
}

export enum PasteItErrorCode {
  NO_CLIPBOARD_DATA = "NO_CLIPBOARD_DATA",
  INVALID_HTML_DATA = "INVALID_HTML_DATA",
  NO_CURRENT_BLOCK = "NO_CURRENT_BLOCK",
  PROCESSING_FAILED = "PROCESSING_FAILED",
  CONTENT_TOO_LARGE = "CONTENT_TOO_LARGE",
}

/**
 * Validation result types
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean
  data?: T
  error?: PasteItError
}

export interface ClipboardValidationResult extends ValidationResult<string> {
  shouldUseDefault: boolean
  html?: string
}

/**
 * Processing context for paste operations
 */
export interface PasteProcessingContext {
  block: BlockContent
  settings: PluginSettings
  html: string
  markdown: string
}

/**
 * TurnDown service configuration
 */
export interface TurndownConfig {
  headingStyle: "atx" | "setext"
  codeBlockStyle: "fenced" | "indented"
  hr: string
  bulletListMarker: string
}

/**
 * Plugin settings schema
 */
export const SETTINGS_SCHEMA: SettingSchemaDesc[] = [
  {
    key: "indentHeaders",
    title: "Whether to indent headers",
    type: "boolean",
    default: true,
    description:
      "Indent headers according to their level in the block hierarchy",
  },
  {
    key: "newLineBlock",
    title: "Whether create a new block for new line",
    type: "boolean",
    default: true,
    description: "Create separate blocks for each line when pasting",
  },
  {
    key: "removeHeaders",
    title: "Whether to remove header tags (#) when pasting",
    type: "boolean",
    default: false,
    description: "Remove markdown header symbols while preserving indentation",
  },
  {
    key: "removeBolds",
    title: "Whether to remove strong tags (**) when pasting",
    type: "boolean",
    default: false,
    description: "Remove bold formatting from pasted content",
  },
  {
    key: "removeHorizontalRules",
    title: "Whether to remove horizontal rules (---) when pasting",
    type: "boolean",
    default: false,
    description: "Remove horizontal rule separators from pasted content",
  },
  {
    key: "removeEmojis",
    title: "Whether to remove emojis when pasting",
    type: "boolean",
    default: false,
    description: "Strip emoji characters from pasted content",
  },
]

/**
 * Type guards for runtime type checking
 */
export namespace TypeGuards {
  export function isPluginSettings(obj: unknown): obj is PluginSettings {
    return typeof obj === "object" && obj !== null
  }

  export function isBlockContent(obj: unknown): obj is BlockContent {
    return typeof obj === "object" && obj !== null && "content" in obj
  }

  export function hasValidClipboardData(event: Event): event is ClipboardEvent {
    return "clipboardData" in event && event.clipboardData !== null
  }
}
