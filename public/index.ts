import "@logseq/libs"
import { splitBlock } from "./splitBlock"
import {
  PluginSettings,
  BlockContent,
  PasteProcessingContext,
  PasteItError,
  PasteItErrorCode,
  SETTINGS_SCHEMA,
} from "./types"
import {
  ContentDetectionService,
  MarkdownProcessingService,
  TurndownServiceFactory,
  ClipboardValidationService,
} from "./services"

/**
 * Enhanced paste processing with better error handling and separation of concerns
 */
class PasteProcessor {
  private turndownService = TurndownServiceFactory.create()

  /**
   * Process paste context and handle markdown conversion
   *
   * @param context - The paste processing context containing HTML content, settings, and block information
   * @throws {PasteItError} When markdown processing fails
   * @returns Promise that resolves when processing is complete
   *
   * @example
   * ```typescript
   * const processor = new PasteProcessor();
   * const context = {
   *   block: currentBlock,
   *   settings: pluginSettings,
   *   html: '<p>Hello world</p>',
   *   markdown: ''
   * };
   * await processor.processMarkdown(context);
   * ```
   */
  /**
   * Process paste context and handle markdown conversion - OPTIMIZED VERSION
   *
   * @param context - The paste processing context containing HTML content, settings, and block information
   * @throws {PasteItError} When markdown processing fails
   * @returns Promise that resolves when processing is complete
   */
  async processMarkdown(context: PasteProcessingContext): Promise<void> {
    try {
      // OPTIMIZATION: Early size check to prevent processing huge content
      if (context.html.length > 500_000) {
        // 500KB limit
        console.warn("Content too large, using fallback")
        await logseq.Editor.insertAtEditingCursor(
          context.html.slice(0, 10000) + "...[truncated]",
        )
        return
      }

      let markdown = this.turndownService.turndown(context.html)
      console.log("🔍 PASTE DEBUG: Step 1 - HTML to Markdown conversion", {
        originalHtmlLength: context.html.length,
        convertedMarkdownLength: markdown.length,
        markdownPreview: markdown.slice(0, 200) + (markdown.length > 200 ? "..." : "")
      })

      // OPTIMIZATION: Fast path for small content (skip Google Docs detection)
      if (markdown.length > 100) {
        const beforeGoogleClean = markdown
        markdown = ContentDetectionService.cleanGoogleDocsFormat(markdown)
        console.log("🔍 PASTE DEBUG: Step 2 - Google Docs format cleaning", {
          beforeLength: beforeGoogleClean.length,
          afterLength: markdown.length,
          wasGoogleDocs: beforeGoogleClean !== markdown,
          cleanedPreview: markdown.slice(0, 200) + (markdown.length > 200 ? "..." : "")
        })
      }

      const beforeContentClean = markdown
      markdown = MarkdownProcessingService.cleanMarkdown(
        markdown,
        context.settings,
      )
      console.log("🔍 PASTE DEBUG: Step 3 - Content cleaning", {
        beforeLength: beforeContentClean.length,
        afterLength: markdown.length,
        cleaningApplied: beforeContentClean !== markdown,
        activeCleaners: {
          removeBolds: context.settings.removeBolds,
          removeHorizontalRules: context.settings.removeHorizontalRules,
          removeEmojis: context.settings.removeEmojis
        },
        cleanedPreview: markdown.slice(0, 200) + (markdown.length > 200 ? "..." : "")
      })

      context.markdown = markdown

      await this.insertMarkdown(markdown, context)
    } catch (error) {
      throw new PasteItError(
        "Failed to process markdown content",
        PasteItErrorCode.PROCESSING_FAILED,
        { originalError: error },
      )
    }
  }

  /**
   * Insert processed markdown into LogSeq using appropriate insertion method
   *
   * @param markdown - The processed markdown content to insert
   * @param context - The paste processing context containing block and settings
   * @throws {PasteItError} When insertion fails
   * @returns Promise that resolves when insertion is complete
   *
   * @example
   * ```typescript
   * await this.insertMarkdown('# Header\nContent', {
   *   block: currentBlock,
   *   settings: { indentHeaders: true },
   *   html: '',
   *   markdown: ''
   * });
   * ```
   */
  /**
   * Insert processed markdown into LogSeq - PERFORMANCE OPTIMIZED
   *
   * @param markdown - The processed markdown content to insert
   * @param context - The paste processing context containing block and settings
   * @throws {PasteItError} When insertion fails
   * @returns Promise that resolves when insertion is complete
   */
  private async insertMarkdown(
    markdown: string,
    context: PasteProcessingContext,
  ): Promise<void> {
    const { block, settings } = context

    if (this.shouldInsertDirectly(block, settings)) {
      const finalMarkdown = settings?.removeHeaders
        ? MarkdownProcessingService.removeHeadersFast(markdown) // OPTIMIZATION: Use fast method
        : markdown
      
      console.log("🔍 PASTE DEBUG: Step 4a - Direct insertion", {
        originalLength: markdown.length,
        finalLength: finalMarkdown.length,
        headersRemoved: markdown !== finalMarkdown,
        finalContent: finalMarkdown.trim()
      })

      await logseq.Editor.insertAtEditingCursor(finalMarkdown.trim())
      console.log("🔍 PASTE DEBUG: Final result - Direct insertion completed")
      return
    }

    // OPTIMIZATION: Early bailout for simple content
    if (markdown.length < 50) {
      console.log("🔍 PASTE DEBUG: Step 4b - Simple content insertion", {
        contentLength: markdown.length,
        content: markdown.trim()
      })
      await logseq.Editor.insertAtEditingCursor(markdown.trim())
      console.log("🔍 PASTE DEBUG: Final result - Simple insertion completed")
      return
    }

    console.log("🔍 PASTE DEBUG: Step 4c - Block splitting required", {
      markdownLength: markdown.length,
      indentHeaders: settings?.indentHeaders
    })

    const newBlocks = splitBlock(markdown, settings?.indentHeaders)
    console.log("🔍 PASTE DEBUG: Step 5 - Block splitting completed", {
      originalMarkdownLength: markdown.length,
      blocksCreated: newBlocks.length,
      blockPreview: newBlocks.slice(0, 3).map(b => ({
        content: b.content.slice(0, 50) + (b.content.length > 50 ? "..." : ""),
        level: b.level,
        hasChildren: !!b.children?.length
      }))
    })

    if (newBlocks.length === 0) {
      console.log("🔍 PASTE DEBUG: Step 5a - No blocks created, fallback to direct insertion")
      await logseq.Editor.insertAtEditingCursor(markdown.trim())
      console.log("🔍 PASTE DEBUG: Final result - Fallback insertion completed")
      return
    }

    const processedBlocks = MarkdownProcessingService.processBlocks(
      newBlocks,
      settings?.removeHeaders ?? false,
    )
    console.log("🔍 PASTE DEBUG: Step 6 - Header removal processing", {
      removeHeaders: settings?.removeHeaders ?? false,
      blocksBeforeProcessing: newBlocks.length,
      blocksAfterProcessing: processedBlocks.length,
      headerChanges: newBlocks.some((b, i) => b.content !== processedBlocks[i]?.content)
    })

    await logseq.Editor.insertBatchBlock(block.uuid!, processedBlocks, {
      sibling: true,
    })
    console.log("🔍 PASTE DEBUG: Final result - Batch block insertion completed", {
      totalBlocks: processedBlocks.length,
      blockUuid: block.uuid,
      finalBlockContents: processedBlocks.map(b => b.content.slice(0, 30) + "...")
    })
  }

  /**
   * Determine if content should be inserted directly vs. as blocks
   *
   * @param block - The current block content
   * @param settings - Plugin settings configuration
   * @returns True if content should be inserted directly, false if blocks should be created
   *
   * @example
   * ```typescript
   * const shouldInsert = this.shouldInsertDirectly(
   *   { content: '#+TITLE: My Title' },
   *   { newLineBlock: false }
   * ); // returns true
   * ```
   */
  private shouldInsertDirectly(
    block: BlockContent,
    settings: PluginSettings,
  ): boolean {
    return block?.content.startsWith("#+") || settings?.newLineBlock === false
  }
}

/**
 * Enhanced paste handler with better error handling and logging
 *
 * Manages paste event interception and processing for the LogSeq editor.
 * Coordinates between clipboard validation, content detection, and markdown processing.
 *
 * @example
 * ```typescript
 * const handler = new PasteEventHandler();
 * handler.initialize();
 * ```
 */
class PasteEventHandler {
  private processor = new PasteProcessor()
  private mainContentContainer: HTMLElement

  /**
   * Initialize the paste event handler with main content container reference
   *
   * @throws {PasteItError} When main content container is not found in DOM
   */
  constructor() {
    const container = parent.document.getElementById("main-content-container")
    if (!container) {
      throw new PasteItError(
        "Main content container not found",
        PasteItErrorCode.NO_CURRENT_BLOCK,
      )
    }
    this.mainContentContainer = container
  }

  /**
   * Initialize event handlers and lifecycle management
   *
   * Sets up paste event listener on main content container and cleanup on unload.
   * Uses bound event handler to maintain proper 'this' context.
   *
   * @example
   * ```typescript
   * const handler = new PasteEventHandler();
   * handler.initialize(); // Sets up all event listeners
   * ```
   */
  initialize(): void {
    this.mainContentContainer.addEventListener(
      "paste",
      this.handlePaste.bind(this),
    )

    logseq.beforeunload(async () => {
      this.cleanup()
    })
  }

  /**
   * Main paste event handler with comprehensive error handling
   *
   * Coordinates the complete paste processing pipeline:
   * 1. Validates clipboard event
   * 2. Detects external vs internal content
   * 3. Gets current block context
   * 4. Creates processing context
   * 5. Delegates to processor
   *
   * @param event - The paste event from the clipboard
   * @returns Promise that resolves when paste processing is complete
   *
   * @example
   * ```typescript
   * // Called automatically when user pastes content
   * // No direct invocation needed - bound to paste events
   * ```
   */
  private async handlePaste(event: ClipboardEvent): Promise<void> {
    try {
      const validation =
        ClipboardValidationService.validateClipboardEvent(event)

      if (!validation.isValid) {
        if (validation.shouldUseDefault) {
          console.log("Using LogSeq default action:", validation.error)
          return
        }
        console.warn("Clipboard validation failed:", validation.error)
        return
      }

      const html = validation.html!
      console.log("🔍 PASTE DEBUG: Initial clipboard content", {
        htmlLength: html.length,
        htmlPreview: html.slice(0, 200) + (html.length > 200 ? "..." : ""),
        isExternal: ContentDetectionService.isExternalContent(html)
      })

      if (!ContentDetectionService.isExternalContent(html)) {
        console.log("🔍 PASTE DEBUG: Skipping - internal LogSeq content detected")
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const block = await this.getCurrentBlock()

      if (this.isCodeBlock(block)) {
        return
      }

      const context: PasteProcessingContext = {
        block,
        settings: this.getPluginSettings(),
        html,
        markdown: "",
      }
      
      console.log("🔍 PASTE DEBUG: Processing context created", {
        blockUuid: block?.uuid,
        blockContent: block?.content?.slice(0, 100),
        settings: context.settings,
        htmlLength: html.length
      })

      await this.processor.processMarkdown(context)
    } catch (error) {
      await this.handlePasteError(error, event)
    }
  }

  /**
   * Get current block with proper error handling
   *
   * @returns Promise resolving to the current block content
   * @throws {PasteItError} When no current block is available
   *
   * @example
   * ```typescript
   * const block = await this.getCurrentBlock();
   * console.log(block.content); // Current block text
   * ```
   */
  private async getCurrentBlock(): Promise<BlockContent> {
    const block = await logseq.Editor.getCurrentBlock()
    if (!block) {
      throw new PasteItError(
        "No current block available",
        PasteItErrorCode.NO_CURRENT_BLOCK,
      )
    }
    return block as BlockContent
  }

  /**
   * Check if current block is a code block
   *
   * @param block - The block content to check
   * @returns True if block is a code block or directive block
   *
   * @example
   * ```typescript
   * const isCode = this.isCodeBlock({ content: '```javascript' });
   * // returns true
   * const isDirective = this.isCodeBlock({ content: '#+TITLE: My Page' });
   * // returns true
   * ```
   */
  private isCodeBlock(block: BlockContent): boolean {
    return block.content.startsWith("```") || block.content.startsWith("#+")
  }

  /**
   * Get plugin settings with type safety
   *
   * @returns Plugin settings object with type safety fallback
   *
   * @example
   * ```typescript
   * const settings = this.getPluginSettings();
   * if (settings.removeHeaders) {
   *   // Process header removal
   * }
   * ```
   */
  private getPluginSettings(): PluginSettings {
    const settings = logseq.settings
    return typeof settings === "object" && settings !== null ? settings : {}
  }

  /**
   * Handle paste processing errors with fallback
   *
   * @param error - The error that occurred during paste processing
   * @param event - The original clipboard event for fallback data
   * @returns Promise that resolves when error handling is complete
   *
   * @example
   * ```typescript
   * try {
   *   await this.processor.processMarkdown(context);
   * } catch (error) {
   *   await this.handlePasteError(error, event);
   * }
   * ```
   */
  private async handlePasteError(
    error: unknown,
    event: ClipboardEvent,
  ): Promise<void> {
    console.error("Paste processing failed:", error)

    try {
      const plainText = event.clipboardData?.getData("text/plain")
      if (plainText) {
        await logseq.Editor.insertAtEditingCursor(plainText)
        console.log("Fallback to plain text successful")
      }
    } catch (fallbackError) {
      console.error("Fallback paste also failed:", fallbackError)
    }
  }

  /**
   * Cleanup event handlers
   *
   * Removes paste event listener from main content container.
   * Called during plugin shutdown or beforeunload.
   *
   * @example
   * ```typescript
   * // Called automatically on plugin shutdown
   * logseq.beforeunload(async () => {
   *   this.cleanup();
   * });
   * ```
   */
  private cleanup(): void {
    this.mainContentContainer.removeEventListener(
      "paste",
      this.handlePaste.bind(this),
    )
  }
}

/**
 * Main plugin initialization
 *
 * Creates and initializes the paste event handler.
 * Called by LogSeq when plugin is loaded and settings are ready.
 *
 * @throws {Error} When plugin initialization fails
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * // Called automatically by LogSeq plugin system
 * logseq.useSettingsSchema(SETTINGS_SCHEMA).ready(main).catch(console.error);
 * ```
 */
async function main(): Promise<void> {
  try {
    const eventHandler = new PasteEventHandler()
    eventHandler.initialize()
    console.log("Paste-it plugin initialized successfully")
  } catch (error) {
    console.error("Failed to initialize paste-it plugin:", error)
    throw error
  }
}

logseq.useSettingsSchema(SETTINGS_SCHEMA).ready(main).catch(console.error)
