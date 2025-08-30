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
    const internalSign = "<meta charset='utf-8'><ul><placeholder>"

    if (
      html !== "" &&
      (html.length < 45 || html.slice(22, 45) != "<!-- directives: [] -->") && // within logseq before v0.8.8
      html.slice(0, internalSign.length) != internalSign // within logseq after v0.8.8
    ) {
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

      // Remove strong tags if removeBolds setting is enabled
      if (logseq.settings?.removeBolds) {
        markdown = markdown.replace(/\*\*([^*]+?)\*\*/g, "$1")
      }

      // Remove horizontal rules if removeHorizontalRules setting is enabled
      if (logseq.settings?.removeHorizontalRules) {
        markdown = markdown.replace(/^---\s*$/gm, "")
      }

      // Remove emojis if removeEmojis setting is enabled
      if (logseq.settings?.removeEmojis) {
        markdown = markdown.replace(
          /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
          "",
        )
      }

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

      // Apply header removal recursively to all blocks if enabled
      const processBlocks = (blocks: any[]): any[] => {
        return blocks.map((b) => {
          let blockContent = b.content
          if (logseq.settings?.removeHeaders) {
            blockContent = blockContent.replace(/^#{1,6}\s*/gm, "")
          }
          return {
            ...b,
            content: blockContent,
            children: b.children?.length
              ? processBlocks(b.children)
              : undefined,
          }
        })
      }

      const processedBlocks = processBlocks(newBlocks)

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
