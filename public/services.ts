/**
 * Core services for LogSeq paste-it plugin
 * Separates concerns and improves maintainability
 */

import TurndownService from "./turndown.js"
import { gfm } from "@guyplusplus/turndown-plugin-gfm"
import { PluginSettings, BlockContent } from "./types"

/**
 * Content validation and detection service
 *
 * Provides methods for detecting content source (internal vs external),
 * identifying specific content types like Google Docs, and cleaning formatting.
 */
export class ContentDetectionService {
  private static readonly INTERNAL_SIGN =
    "<meta charset='utf-8'><ul><placeholder>"
  private static readonly MIN_EXTERNAL_CONTENT_LENGTH = 45
  private static readonly DIRECTIVE_MARKER = "<!-- directives: [] -->"
  private static readonly DIRECTIVE_MARKER_OFFSET = 22

  /**
   * Determines if HTML content is from external source
   *
   * @param html - The HTML content to analyze
   * @returns True if content is from external source, false for LogSeq internal content
   *
   * @example
   * ```typescript
   * const isExternal = ContentDetectionService.isExternalContent('<p>Hello</p>');
   * // returns true - external content
   *
   * const isInternal = ContentDetectionService.isExternalContent(
   *   "<meta charset='utf-8'><ul><placeholder>"
   * );
   * // returns false - LogSeq internal
   * ```
   */
  static isExternalContent(html: string): boolean {
    if (!html) return false
    if (html.length < this.MIN_EXTERNAL_CONTENT_LENGTH) return true

    return (
      !html.startsWith(this.INTERNAL_SIGN) &&
      !html.includes(this.DIRECTIVE_MARKER, this.DIRECTIVE_MARKER_OFFSET)
    )
  }

  /**
   * Detects Google Docs specific formatting
   *
   * @param markdown - The markdown content to analyze
   * @returns True if content has Google Docs wrapper formatting
   *
   * @example
   * ```typescript
   * const isGoogleDocs = ContentDetectionService.isGoogleDocsContent('**\nContent\n**');
   * // returns true - Google Docs format detected
   * ```
   */
  static isGoogleDocsContent(markdown: string): boolean {
    const MIN_GOOGLE_DOCS_LENGTH = 6
    const GOOGLE_DOCS_PREFIX = "**\n"
    const GOOGLE_DOCS_SUFFIX = "\n**"

    return (
      markdown.length > MIN_GOOGLE_DOCS_LENGTH &&
      markdown.slice(0, 3) === GOOGLE_DOCS_PREFIX &&
      markdown.slice(markdown.length - 3) === GOOGLE_DOCS_SUFFIX
    )
  }

  /**
   * Cleans Google Docs wrapper formatting
   *
   * @param markdown - The markdown content to clean
   * @returns Cleaned markdown with Google Docs wrapper removed
   *
   * @example
   * ```typescript
   * const cleaned = ContentDetectionService.cleanGoogleDocsFormat('**\nContent\n**');
   * // returns 'Content' - wrapper removed
   * ```
   */
  static cleanGoogleDocsFormat(markdown: string): string {
    if (this.isGoogleDocsContent(markdown)) {
      return markdown.slice(3, markdown.length - 3)
    }
    return markdown
  }
}

/**
 * Markdown cleaning and processing service
 *
 * Provides methods for cleaning and processing markdown content based on plugin settings.
 * Handles removal of formatting elements like bolds, headers, horizontal rules, and emojis.
 */
export class MarkdownProcessingService {
  private static readonly REGEX_PATTERNS = {
    BOLD_REMOVAL: /\*\*([^*]+?)\*\*/g,
    HEADER_REMOVAL: /^#{1,6}\s*/gm,
    HORIZONTAL_RULE: /^---\s*$/gm,
    EMOJI_REMOVAL:
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
  }

  private static readonly MAX_CONTENT_SIZE = 1_000_000

  /**
   * Applies content cleaning based on settings
   *
   * @param markdown - The markdown content to clean
   * @param settings - Plugin settings determining which cleaning to apply
   * @returns Cleaned markdown content
   *
   * @example
   * ```typescript
   * const cleaned = MarkdownProcessingService.cleanMarkdown(
   *   '**Bold text** with emoji 😀',
   *   { removeBolds: true, removeEmojis: true }
   * );
   * // returns 'Bold text with emoji '
   * ```
   */
  static cleanMarkdown(markdown: string, settings: PluginSettings): string {
    if (!this.shouldClean(settings)) {
      return markdown
    }

    if (markdown.length > this.MAX_CONTENT_SIZE) {
      console.warn("Content too large, skipping cleaning")
      return markdown
    }

    let result = markdown

    if (settings.removeBolds) {
      result = result.replace(this.REGEX_PATTERNS.BOLD_REMOVAL, "$1")
    }
    if (settings.removeHorizontalRules) {
      result = result.replace(this.REGEX_PATTERNS.HORIZONTAL_RULE, "")
    }
    if (settings.removeEmojis) {
      result = result.replace(this.REGEX_PATTERNS.EMOJI_REMOVAL, "")
    }

    return result
  }

  /**
   * Processes blocks to remove headers if enabled
   *
   * @param blocks - Array of block content to process
   * @param removeHeaders - Whether to remove header formatting
   * @returns Processed blocks with headers removed if enabled
   *
   * @example
   * ```typescript
   * const processed = MarkdownProcessingService.processBlocks(
   *   [{ content: '# Header text' }],
   *   true
   * );
   * // returns [{ content: 'Header text' }]
   * ```
   */
  static processBlocks(
    blocks: BlockContent[],
    removeHeaders: boolean,
  ): BlockContent[] {
    if (!removeHeaders) return blocks

    const processQueue = [...blocks]

    while (processQueue.length > 0) {
      const block = processQueue.shift()!

      block.content = block.content.replace(
        this.REGEX_PATTERNS.HEADER_REMOVAL,
        "",
      )

      if (block.children?.length) {
        processQueue.unshift(...block.children)
      }
    }

    return blocks
  }

  /**
   * Removes headers from simple markdown text
   *
   * @param markdown - The markdown text to process
   * @returns Markdown with header symbols removed
   *
   * @example
   * ```typescript
   * const cleaned = MarkdownProcessingService.removeHeaders('# Title\n## Subtitle');
   * // returns 'Title\nSubtitle'
   * ```
   */
  static removeHeaders(markdown: string): string {
    return markdown.replace(this.REGEX_PATTERNS.HEADER_REMOVAL, "")
  }

  /**
   * Determines if any cleaning operations should be performed
   *
   * @param settings - Plugin settings to check
   * @returns True if any cleaning operations are enabled
   */
  private static shouldClean(settings: PluginSettings): boolean {
    return !!(
      settings?.removeBolds ||
      settings?.removeHorizontalRules ||
      settings?.removeEmojis
    )
  }
}

/**
 * TurnDown service configuration and management
 *
 * Factory for creating configured TurnDown service instances.
 * Handles HTML to Markdown conversion with custom rules and GFM support.
 */
export class TurndownServiceFactory {
  /**
   * Creates a configured TurnDown service instance
   *
   * @returns Configured TurndownService with custom rules and GFM support
   *
   * @example
   * ```typescript
   * const service = TurndownServiceFactory.create();
   * const markdown = service.turndown('<h1>Title</h1>');
   * // returns '# Title'
   * ```
   */
  static create(): TurndownService {
    const service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      hr: "---",
      bulletListMarker: "",
    })

    service.addRule("pre", {
      filter: ["pre"],
      replacement: (content) => {
        return "```\n" + content.trim() + "\n```"
      },
    })

    gfm(service)

    service.remove("style")

    return service
  }
}

/**
 * Clipboard event validation service
 *
 * Validates clipboard events and determines appropriate handling strategy.
 * Distinguishes between file drops, HTML content, and other paste types.
 */
export class ClipboardValidationService {
  /**
   * Validates clipboard event and returns validation result
   *
   * @param event - The clipboard event to validate
   * @returns Validation result with handling recommendations
   *
   * @example
   * ```typescript
   * const validation = ClipboardValidationService.validateClipboardEvent(event);
   * if (validation.isValid) {
   *   processHtml(validation.html);
   * } else if (validation.shouldUseDefault) {
   *   // Let LogSeq handle it
   * }
   * ```
   */
  static validateClipboardEvent(event: ClipboardEvent): {
    isValid: boolean
    shouldUseDefault: boolean
    html?: string
    error?: string
  } {
    if (!event?.clipboardData) {
      return {
        isValid: false,
        shouldUseDefault: false,
        error: "No clipboard data available",
      }
    }

    const pasteTypes = event.clipboardData.types

    if (pasteTypes.includes("Files") && !pasteTypes.includes("text/plain")) {
      return {
        isValid: false,
        shouldUseDefault: true,
        error: "File paste - using default behavior",
      }
    }

    const html = event.clipboardData.getData("text/html")

    if (typeof html !== "string") {
      return {
        isValid: false,
        shouldUseDefault: false,
        error: "Invalid HTML data type",
      }
    }

    return {
      isValid: true,
      shouldUseDefault: false,
      html,
    }
  }
}
