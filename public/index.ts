import "@logseq/libs"
import TurndownService from "./turndown.js"
import { gfm } from "@guyplusplus/turndown-plugin-gfm"
import { splitBlock } from "./splitBlock"
import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user"

const settings: SettingSchemaDesc[] = [
  {
    key: "indentHeaders",
    title: "Whether to indent headers",
    type: "boolean",
    default: true,
    description: "",
  },
  {
    key: "newLineBlock",
    title: "Whether create a new block for new line",
    type: "boolean",
    default: true,
    description: "",
  },
  {
    key: "removeHeaders",
    title: "Whether to remove header tags (#) when pasting",
    type: "boolean",
    default: false,
    description: "",
  },
  {
    key: "removeBolds",
    title: "Whether to remove strong tags (**) when pasting",
    type: "boolean",
    default: false,
    description: "",
  },
  {
    key: "removeHorizontalRules",
    title: "Whether to remove horizontal rules (---) when pasting",
    type: "boolean",
    default: false,
    description: "",
  },
  {
    key: "removeEmojis",
    title: "Whether to remove emojis when pasting",
    type: "boolean",
    default: false,
    description: "",
  },
]

// Pre-compiled regex patterns for performance
const REGEX_PATTERNS = {
  BOLD_REMOVAL: /\*\*([^*]+?)\*\*/g,
  HEADER_REMOVAL: /^#{1,6}\s*/gm,
  HORIZONTAL_RULE: /^---\s*$/gm,
  EMOJI_REMOVAL: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
}

// Constants for performance
const MAX_CONTENT_SIZE = 1000000 // 1MB limit
const INTERNAL_SIGN = "<meta charset='utf-8'><ul><placeholder>"

// Optimized content cleaning function
function cleanMarkdown(markdown: string, settings: any): string {
  // Early exit if no cleaning needed
  if (!settings?.removeBolds && !settings?.removeHorizontalRules && !settings?.removeEmojis) {
    return markdown
  }

  // Input size validation
  if (markdown.length > MAX_CONTENT_SIZE) {
    console.warn("Content too large, skipping cleaning")
    return markdown
  }

  let result = markdown

  // Apply enabled cleaning operations in single pass where possible
  if (settings.removeBolds) {
    result = result.replace(REGEX_PATTERNS.BOLD_REMOVAL, "$1")
  }
  if (settings.removeHorizontalRules) {
    result = result.replace(REGEX_PATTERNS.HORIZONTAL_RULE, "")
  }
  if (settings.removeEmojis) {
    result = result.replace(REGEX_PATTERNS.EMOJI_REMOVAL, "")
  }

  return result
}

// Optimized block processing function
function processBlocksOptimized(blocks: any[], removeHeaders: boolean): any[] {
  if (!removeHeaders) return blocks

  // Iterative processing to avoid deep recursion
  const processQueue = [...blocks]
  const result = []

  while (processQueue.length > 0) {
    const block = processQueue.shift()
    
    // Apply header removal
    block.content = block.content.replace(REGEX_PATTERNS.HEADER_REMOVAL, "")
    
    // Add children to queue for processing
    if (block.children?.length) {
      processQueue.unshift(...block.children)
    }
    
    result.push(block)
  }

  return blocks // Return original structure with modified content
}

// Fast content detection
function isExternalContent(html: string): boolean {
  if (!html) return false
  if (html.length < 45) return true
  
  return !html.startsWith(INTERNAL_SIGN) && 
         !html.includes("<!-- directives: [] -->", 22)
}

async function main() {
  const css = (t, ...args) => String.raw(t, ...args)
  let mainContentContainer = parent.document.getElementById(
    "main-content-container",
  )
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    hr: "---",
    bulletListMarker: "",
  })

  turndownService.addRule("pre", {
    filter: ["pre"],
    replacement: (content) => {
      return "```\n" + content.trim() + "\n```"
    },
  })

  gfm(turndownService)

  turndownService.remove("style")

  // @ts-ignore
  turndownService.escape = (string) => {
    return string
  }

  async function pasteHandler(e: ClipboardEvent) {
    const pasteTypes = e.clipboardData.types

    if (pasteTypes.includes("Files") && !pasteTypes.includes("text/plain")) {
      console.log("use logseq default action")
      return
    }

    const html = e.clipboardData.getData("text/html")

    // Use optimized content detection
    if (isExternalContent(html)) {
      e.preventDefault()
      e.stopPropagation()

      const block = await logseq.Editor.getCurrentBlock()
      if (block.content.startsWith("```")) {
        // ignore code block
        return
      }
      // @ts-ignore
      let markdown: string = turndownService.turndown(html)
      // console.log("html source\n", html)
      // console.log("markdown result\n"+markdown)

      if (
        markdown.length > 6 &&
        markdown.slice(0, 3) === "**\n" &&
        markdown.slice(markdown.length - 3) === "\n**"
      ) {
        markdown = markdown.slice(3, markdown.length - 3) // remove google docs **
      }

      // Apply optimized content cleaning
      markdown = cleanMarkdown(markdown, logseq.settings)

      if (
        (block && block.content.startsWith("#+")) ||
        logseq.settings?.newLineBlock === false
      ) {
        // Apply header removal here for cursor insertion
        let finalMarkdown = markdown
        if (logseq.settings?.removeHeaders) {
          finalMarkdown = finalMarkdown.replace(/^#{1,6}\s*/gm, "")
        }
        await logseq.Editor.insertAtEditingCursor(finalMarkdown.trim())
        return
      }

      const newBlocks = splitBlock(markdown, logseq.settings?.indentHeaders)

      // Apply optimized header removal recursively to all blocks if enabled
      const processedBlocks = processBlocksOptimized(newBlocks, logseq.settings?.removeHeaders)

      if (processedBlocks.length === 0) {
        await logseq.Editor.insertAtEditingCursor(markdown.trim())
        return
      }

      await logseq.Editor.insertBatchBlock(block.uuid, processedBlocks, {
        sibling: true,
      })
    }
  }
  mainContentContainer.addEventListener("paste", pasteHandler)

  logseq.beforeunload(async () => {
    mainContentContainer.removeEventListener("paste", pasteHandler)
  })
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)
