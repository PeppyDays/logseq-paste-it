import { IBatchBlock } from "@logseq/libs/dist/LSPlugin.user"
import { BlockContent } from "./types"

/**
 * Enhanced block splitting with improved readability and maintainability
 *
 * Provides functionality to split markdown content into hierarchical LogSeq blocks
 * with support for headers, code blocks, tables, and proper indentation.
 */

/**
 * Configuration for block splitting behavior
 *
 * @interface SplitBlockConfig
 */
interface SplitBlockConfig {
  /** Whether headers should be indented based on their level */
  indentHeaders: boolean
  /** Whether code blocks should be preserved as single units */
  preserveCodeBlocks: boolean
  /** Whether table rows should be grouped together */
  preserveTables: boolean
}

/**
 * Block processing context for maintaining state
 *
 * @interface BlockContext
 */
interface BlockContext {
  /** Indentation level of the block */
  indent: number
  /** The block content and structure */
  block: IBatchBlock
  /** Parent block if this is a child block */
  parent?: IBatchBlock
}

/**
 * Utilities for content analysis
 *
 * Provides static methods for analyzing different types of content
 * including empty lines, code blocks, tables, and headers.
 */
class ContentAnalyzer {
  /**
   * Check if line is effectively empty (whitespace only)
   *
   * @param line - The line to analyze
   * @returns True if line contains only whitespace
   *
   * @example
   * ```typescript
   * ContentAnalyzer.isEmpty('   '); // returns true
   * ContentAnalyzer.isEmpty('text'); // returns false
   * ```
   */
  static isEmpty(line: string): boolean {
    return /^\s*$/.test(line)
  }

  /**
   * Detect code block markers
   *
   * @param line - The line to analyze
   * @returns True if line starts a code block
   *
   * @example
   * ```typescript
   * ContentAnalyzer.isCodeBlockStart('```javascript'); // returns true
   * ContentAnalyzer.isCodeBlockStart('code'); // returns false
   * ```
   */
  static isCodeBlockStart(line: string): boolean {
    return line.trim().startsWith("```")
  }

  /**
   * Detect table row markers
   *
   * @param line - The line to analyze
   * @returns True if line is a table row
   *
   * @example
   * ```typescript
   * ContentAnalyzer.isTableRow('| Col1 | Col2 |'); // returns true
   * ContentAnalyzer.isTableRow('regular text'); // returns false
   * ```
   */
  static isTableRow(line: string): boolean {
    return line.trim().startsWith("|")
  }

  /**
   * Detect header markers
   *
   * @param line - The line to analyze
   * @returns True if line is a markdown header
   *
   * @example
   * ```typescript
   * ContentAnalyzer.isHeader('# Title'); // returns true
   * ContentAnalyzer.isHeader('## Subtitle'); // returns true
   * ContentAnalyzer.isHeader('regular text'); // returns false
   * ```
   */
  static isHeader(line: string): boolean {
    return line.trimStart().startsWith("#")
  }

  /**
   * Calculate header level (1-6)
   *
   * @param line - The header line to analyze
   * @returns Header level from 1-6, or 0 if not a header
   *
   * @example
   * ```typescript
   * ContentAnalyzer.getHeaderLevel('# Title'); // returns 1
   * ContentAnalyzer.getHeaderLevel('### Subtitle'); // returns 3
   * ContentAnalyzer.getHeaderLevel('regular text'); // returns 0
   * ```
   */
  static getHeaderLevel(line: string): number {
    const content = line.trimStart()
    let level = 0

    for (let i = 0; i < content.length && i < 6; i++) {
      if (content[i] === "#") {
        level++
      } else {
        break
      }
    }

    return level
  }

  /**
   * Calculate indentation level
   *
   * @param line - The line to analyze
   * @param isHeader - Whether the line is a header
   * @param indentHeaders - Whether headers should be indented by level
   * @returns Indentation level for block hierarchy
   *
   * @example
   * ```typescript
   * ContentAnalyzer.getIndentLevel('# Title', true, true); // returns -5
   * ContentAnalyzer.getIndentLevel('  text', false, false); // returns 2
   * ```
   */
  static getIndentLevel(
    line: string,
    isHeader: boolean,
    indentHeaders: boolean,
  ): number {
    if (isHeader && indentHeaders) {
      return this.getHeaderLevel(line) - 6
    }

    if (isHeader && !indentHeaders) {
      return 0
    }

    const content = line.trimStart()
    return line.length - content.length
  }
}

/**
 * Line grouping processor for code blocks and tables
 *
 * Handles grouping of related lines that should be kept together
 * as single blocks (code blocks, tables, etc.).
 */
class LineGroupProcessor {
  /**
   * Process code blocks by grouping related lines
   *
   * @param lines - Array of all lines being processed
   * @param startIndex - Index of the code block start marker
   * @returns Object with grouped lines and next processing index
   *
   * @example
   * ```typescript
   * const result = LineGroupProcessor.processCodeBlock(
   *   ['```js', 'console.log("hello")', '```'],
   *   0
   * );
   * // result.processedLines contains the complete code block
   * // result.nextIndex is 3 (after the closing ```)
   * ```
   */
  static processCodeBlock(
    lines: string[],
    startIndex: number,
  ): {
    processedLines: string
    nextIndex: number
  } {
    const codeLines: string[] = [lines[startIndex]]
    let i = startIndex + 1

    while (i < lines.length && !ContentAnalyzer.isCodeBlockStart(lines[i])) {
      codeLines.push("  " + lines[i])
      i++
    }

    if (i < lines.length) {
      codeLines.push(lines[i])
      i++
    }

    return {
      processedLines: codeLines.join("\n"),
      nextIndex: i,
    }
  }

  /**
   * Process tables by grouping consecutive table rows
   *
   * @param lines - Array of all lines being processed
   * @param startIndex - Index of the first table row
   * @returns Object with grouped table lines and next processing index
   *
   * @example
   * ```typescript
   * const result = LineGroupProcessor.processTable(
   *   ['| Col1 | Col2 |', '|------|------|', '| A | B |'],
   *   0
   * );
   * // result.processedLines contains the complete table
   * // result.nextIndex is 3 (after the last table row)
   * ```
   */
  static processTable(
    lines: string[],
    startIndex: number,
  ): {
    processedLines: string
    nextIndex: number
  } {
    const tableLines: string[] = [lines[startIndex]]
    let i = startIndex + 1

    while (i < lines.length && ContentAnalyzer.isTableRow(lines[i])) {
      tableLines.push(lines[i])
      i++
    }

    return {
      processedLines: tableLines.join("\n"),
      nextIndex: i,
    }
  }
}

/**
 * Block hierarchy manager
 *
 * Manages the construction of hierarchical block structure
 * based on indentation levels and parent-child relationships.
 */
class HierarchyManager {
  private stack: BlockContext[] = []
  private result: IBatchBlock[] = []

  /**
   * Add a block to the hierarchy
   *
   * @param content - The text content of the block
   * @param indent - The indentation level determining hierarchy position
   *
   * @example
   * ```typescript
   * const manager = new HierarchyManager();
   * manager.addBlock('Parent block', 0);
   * manager.addBlock('Child block', 2);
   * manager.addBlock('Another parent', 0);
   * ```
   */
  addBlock(content: string, indent: number): void {
    const nextBlock: IBatchBlock = {
      content,
      children: [],
    }

    if (this.stack.length === 0) {
      this.addToRoot(nextBlock, indent)
      return
    }

    const currentTop = this.stack[this.stack.length - 1]
    const indentDiff = indent - currentTop.indent

    if (indentDiff === 0) {
      this.addSibling(nextBlock, indent)
    } else if (indentDiff > 0) {
      this.addChild(nextBlock, indent)
    } else {
      this.addParentSibling(nextBlock, indent)
    }
  }

  /**
   * Get the constructed hierarchy
   *
   * @returns Array of top-level blocks with nested children
   *
   * @example
   * ```typescript
   * const hierarchy = manager.getResult();
   * // Returns structured blocks ready for LogSeq insertion
   * ```
   */
  getResult(): IBatchBlock[] {
    return this.result
  }

  /**
   * Add block as root-level element
   *
   * @param block - The block to add
   * @param indent - The indentation level
   */
  private addToRoot(block: IBatchBlock, indent: number): void {
    this.result.push(block)
    this.stack.push({ indent, block })
  }

  /**
   * Add block as sibling to current level
   *
   * @param block - The block to add
   * @param indent - The indentation level
   */
  private addSibling(block: IBatchBlock, indent: number): void {
    const top = this.stack[this.stack.length - 1]

    if (top.parent) {
      top.parent.children!.push(block)
    } else {
      this.result.push(block)
    }

    top.block = block
  }

  /**
   * Add block as child of current block
   *
   * @param block - The block to add
   * @param indent - The indentation level
   */
  private addChild(block: IBatchBlock, indent: number): void {
    const top = this.stack[this.stack.length - 1]
    top.block.children!.push(block)

    this.stack.push({
      indent,
      block,
      parent: top.block,
    })
  }

  /**
   * Add block as sibling to parent level (unindent)
   *
   * @param block - The block to add
   * @param indent - The indentation level
   */
  private addParentSibling(block: IBatchBlock, indent: number): void {
    while (
      this.stack.length > 0 &&
      this.stack[this.stack.length - 1].indent > indent
    ) {
      this.stack.pop()
    }

    if (this.stack.length === 0) {
      this.addToRoot(block, indent)
      return
    }

    const top = this.stack[this.stack.length - 1]

    if (top.indent === indent) {
      this.addSibling(block, indent)
    } else {
      this.addChild(block, indent)
    }
  }
}

/**
 * Enhanced split block function with improved maintainability
 *
 * Processes raw markdown content and converts it into hierarchical LogSeq blocks.
 * Handles headers, code blocks, tables, and maintains proper indentation relationships.
 *
 * @param blockContent - Raw markdown content to split
 * @param indentHeaders - Whether to indent headers based on their level
 * @returns Array of structured blocks ready for LogSeq insertion
 *
 * @example
 * ```typescript
 * const blocks = splitBlock('# Title\nSome content\n## Subtitle', true);
 * // Returns structured blocks with proper hierarchy
 * ```
 */
export function splitBlock(
  blockContent: string,
  indentHeaders: boolean = true,
): IBatchBlock[] {
  if (!blockContent?.trim()) {
    return []
  }

  const rawLines = blockContent
    .split(/\n/)
    .filter((line) => !ContentAnalyzer.isEmpty(line))

  if (rawLines.length <= 1) {
    return []
  }

  const processedLines = processGroupedContent(rawLines)

  if (processedLines.length <= 1) {
    return []
  }

  return buildBlockHierarchy(processedLines, indentHeaders)
}

/**
 * Process lines to group code blocks and tables
 *
 * @param lines - Array of content lines to process
 * @returns Array of processed lines with grouped content
 *
 * @example
 * ```typescript
 * const grouped = processGroupedContent([
 *   '```js',
 *   'console.log("test")',
 *   '```',
 *   'regular line'
 * ]);
 * // Returns grouped code block as single element
 * ```
 */
function processGroupedContent(lines: string[]): string[] {
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (ContentAnalyzer.isCodeBlockStart(line)) {
      const { processedLines, nextIndex } = LineGroupProcessor.processCodeBlock(
        lines,
        i,
      )
      result.push(processedLines)
      i = nextIndex
    } else if (ContentAnalyzer.isTableRow(line)) {
      const { processedLines, nextIndex } = LineGroupProcessor.processTable(
        lines,
        i,
      )
      result.push(processedLines)
      i = nextIndex
    } else {
      result.push(line)
      i++
    }
  }

  return result
}

/**
 * Build block hierarchy from processed lines
 *
 * @param lines - Array of processed content lines
 * @param indentHeaders - Whether to indent headers based on their level
 * @returns Array of hierarchical blocks
 *
 * @example
 * ```typescript
 * const hierarchy = buildBlockHierarchy([
 *   '# Main Title',
 *   'Content under title',
 *   '## Subtitle'
 * ], true);
 * // Returns blocks with proper parent-child relationships
 * ```
 */
function buildBlockHierarchy(
  lines: string[],
  indentHeaders: boolean,
): IBatchBlock[] {
  const hierarchyManager = new HierarchyManager()

  lines.forEach((line) => {
    const content = line.trimStart()
    const isHeader = ContentAnalyzer.isHeader(content)
    const indent = ContentAnalyzer.getIndentLevel(line, isHeader, indentHeaders)

    hierarchyManager.addBlock(content, indent)
  })

  return hierarchyManager.getResult()
}
