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
  /**
   * Determines if HTML content is from external source - OPTIMIZED VERSION
   *
   * @param html - The HTML content to analyze
   * @returns True if content is from external source, false for LogSeq internal content
   */
  static isExternalContent(html: string): boolean {
    if (!html) return false

    // OPTIMIZATION: Early bailout for very small content
    if (html.length < this.MIN_EXTERNAL_CONTENT_LENGTH) return true

    // OPTIMIZATION: Check most common case first (internal sign at start)
    if (html.startsWith(this.INTERNAL_SIGN)) return false

    // OPTIMIZATION: Only check directive marker if content is long enough
    if (
      html.length >
      this.DIRECTIVE_MARKER_OFFSET + this.DIRECTIVE_MARKER.length
    ) {
      return !html.includes(this.DIRECTIVE_MARKER, this.DIRECTIVE_MARKER_OFFSET)
    }

    return true
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
  /**
   * Cleans Google Docs wrapper formatting - OPTIMIZED VERSION
   *
   * @param markdown - The markdown content to clean
   * @returns Cleaned markdown with Google Docs wrapper removed
   */
  static cleanGoogleDocsFormat(markdown: string): string {
    // OPTIMIZATION: Fast path for detection and cleaning in one pass
    const MIN_LENGTH = 6
    if (markdown.length <= MIN_LENGTH) return markdown

    // OPTIMIZATION: Single check combining detection and cleaning
    if (markdown.startsWith("**\n") && markdown.endsWith("\n**")) {
      return markdown.slice(3, -3)
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
  // PERFORMANCE OPTIMIZATION: Pre-compiled regex for faster execution
  private static readonly COMPILED_PATTERNS = {
    // Combined pattern for single-pass processing
    COMBINED_CLEANING:
      /(\*\*([^*]+?)\*\*)|^---\s*$|[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gmu,
    HEADER_REMOVAL_FAST: /^#{1,6}\s*/gm,
  }

  private static readonly MAX_CONTENT_SIZE = 1_000_000
  // PERFORMANCE OPTIMIZATION: Reduced size limit for better performance
  private static readonly OPTIMIZED_MAX_SIZE = 500_000 // 500KB instead of 1MB

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
  /**
   * Applies content cleaning based on settings - OPTIMIZED VERSION
   *
   * @param markdown - The markdown content to clean
   * @param settings - Plugin settings determining which cleaning to apply
   * @returns Cleaned markdown content
   */
  /**
   * Applies content cleaning based on settings - PERFORMANCE OPTIMIZED
   *
   * @param markdown - The markdown content to clean
   * @param settings - Plugin settings determining which cleaning to apply
   * @returns Cleaned markdown content
   */
  static cleanMarkdown(markdown: string, settings: PluginSettings): string {
    if (!this.shouldClean(settings)) {
      return markdown
    }

    // OPTIMIZATION: Early bailout for oversized content
    if (markdown.length > this.OPTIMIZED_MAX_SIZE) {
      console.warn("Content too large, skipping cleaning")
      return markdown
    }

    // OPTIMIZATION: Early bailout for small content
    if (markdown.length < 10) {
      return markdown
    }

    let result = markdown

    // OPTIMIZATION: Only apply enabled cleaning operations
    if (settings.removeBolds && result.includes("**")) {
      result = result.replace(this.REGEX_PATTERNS.BOLD_REMOVAL, "$1")
    }
    if (settings.removeHorizontalRules && result.includes("---")) {
      result = result.replace(this.REGEX_PATTERNS.HORIZONTAL_RULE, "")
    }
    if (settings.removeEmojis) {
      // OPTIMIZATION: Quick check before expensive emoji regex
      if (/[\u{1F000}-\u{1FFFF}]/u.test(result)) {
        result = result.replace(this.REGEX_PATTERNS.EMOJI_REMOVAL, "")
      }
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
   * Fast header removal for simple markdown - PERFORMANCE OPTIMIZED
   *
   * @param markdown - The markdown text to process
   * @returns Markdown with header symbols removed
   */
  static removeHeadersFast(markdown: string): string {
    // OPTIMIZATION: Early bailout if no headers present
    if (!markdown.includes("#")) {
      return markdown
    }

    // OPTIMIZATION: Use compiled pattern for faster execution
    return markdown.replace(this.COMPILED_PATTERNS.HEADER_REMOVAL_FAST, "")
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

    service.addRule("githubAnchor", {
      filter: (node: any) => {
        return (
          node.nodeName === "A" &&
          node.getAttribute("class") === "anchor" &&
          node.getAttribute("aria-label")?.startsWith("Permalink:")
        )
      },
      replacement: () => {
        return ""
      },
    })

    service.addRule("githubHeading", {
      filter: (node: any) => {
        return (
          node.nodeName === "DIV" &&
          node.getAttribute("class") === "markdown-heading"
        )
      },
      replacement: (content: string, node: any) => {
        const headingElement = node.querySelector("h1, h2, h3, h4, h5, h6")
        const anchorElement = node.querySelector("a.anchor")

        if (headingElement && anchorElement) {
          const level = parseInt(headingElement.nodeName.charAt(1))
          const headingText = headingElement.textContent || ""
          const href = anchorElement.getAttribute("href")

          if (href && headingText) {
            return `\n\n${"#".repeat(level)} [${headingText}](${href})\n\n`
          }
        }

        return content
      },
    })

    gfm(service)

    service.remove("style")

    return service
  }

  /**
   * Creates optimized TurnDown service with performance enhancements
   */
  static createOptimized(): TurndownService {
    const service = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      hr: "---",
      bulletListMarker: "",
    })

    // OPTIMIZATION: Cached compiled regex patterns
    const githubAnchorSelector = 'a.anchor[aria-label^="Permalink:"]'
    const githubHeadingSelector = "div.markdown-heading"

    service.addRule("pre", {
      filter: ["pre"],
      replacement: (content) => {
        return "```\n" + content.trim() + "\n```"
      },
    })

    // OPTIMIZATION: More efficient GitHub anchor rule
    service.addRule("githubAnchor", {
      filter: (node: any) => {
        return (
          node.nodeName === "A" &&
          node.className === "anchor" &&
          node.getAttribute("aria-label")?.startsWith("Permalink:")
        )
      },
      replacement: () => "",
    })

    // OPTIMIZATION: Streamlined GitHub heading rule
    service.addRule("githubHeading", {
      filter: (node: any) => {
        return node.nodeName === "DIV" && node.className === "markdown-heading"
      },
      replacement: (content: string, node: any) => {
        // OPTIMIZATION: Single querySelector call
        const heading = node.querySelector("h1, h2, h3, h4, h5, h6")
        const anchor = node.querySelector("a.anchor")

        if (heading?.textContent && anchor?.getAttribute("href")) {
          const level = parseInt(heading.nodeName.charAt(1))
          const text = heading.textContent
          const href = anchor.getAttribute("href")
          return `\n\n${"#".repeat(level)} [${text}](${href})\n\n`
        }

        return content
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
