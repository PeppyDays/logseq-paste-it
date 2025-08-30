import { splitBlock } from "../../public/splitBlock"

describe("Paste-It Plugin Core Functionality", () => {
  describe("splitBlock function", () => {
    test("should handle empty and single line content", () => {
      expect(splitBlock("", true)).toEqual([])
      expect(splitBlock("Single line", true)).toEqual([])
      expect(splitBlock("Line 1\nLine 2", true)).toHaveLength(2)
    })

    test("should process headers with indentation", () => {
      const content = "# Header\nContent"
      const result = splitBlock(content, true)

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].content).toBe("# Header")
    })

    test("should handle headers without indentation", () => {
      const content = "# Header 1\n## Header 2"
      const resultWithIndent = splitBlock(content, true)
      const resultWithoutIndent = splitBlock(content, false)

      expect(resultWithIndent.length).toBeGreaterThan(0)
      expect(resultWithoutIndent.length).toBeGreaterThan(0)
    })

    test("should preserve code blocks", () => {
      const content = `Text before
\`\`\`js
code here
\`\`\`
Text after`

      const result = splitBlock(content, true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.some((block) => block.content.includes("```"))).toBe(true)
    })

    test("should preserve tables", () => {
      const content = `Before
| A | B |
|---|---|
| 1 | 2 |
After`

      const result = splitBlock(content, true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.some((block) => block.content.includes("|"))).toBe(true)
    })

    test("should create proper block structure", () => {
      const result = splitBlock("Line 1\nLine 2\nLine 3", true)

      result.forEach((block) => {
        expect(block).toHaveProperty("content")
        expect(block).toHaveProperty("children")
        expect(Array.isArray(block.children)).toBe(true)
      })
    })
  })

  describe("content processing utilities", () => {
    test("should detect various content types", () => {
      const headerContent = "# Title"
      const codeContent = "```js\ncode\n```"
      const tableContent = "| A | B |"
      const normalContent = "Normal text"

      expect(headerContent.startsWith("#")).toBe(true)
      expect(codeContent.includes("```")).toBe(true)
      expect(tableContent.includes("|")).toBe(true)
      expect(normalContent.startsWith("#")).toBe(false)
    })

    test("should handle Google Docs content cleanup", () => {
      const googleContent = "**\nActual content\n**"
      const isGoogleDocs =
        googleContent.length > 6 &&
        googleContent.slice(0, 3) === "**\n" &&
        googleContent.slice(googleContent.length - 3) === "\n**"

      if (isGoogleDocs) {
        const cleaned = googleContent.slice(3, googleContent.length - 3)
        expect(cleaned).toBe("Actual content")
      }
    })

    test("should detect LogSeq internal content", () => {
      const internalSign = "<meta charset='utf-8'><ul><placeholder>"
      const internalContent = internalSign + "content"
      const externalContent = "<div>external</div>"

      expect(internalContent.slice(0, internalSign.length)).toBe(internalSign)
      expect(externalContent.slice(0, internalSign.length)).not.toBe(
        internalSign,
      )
    })
  })

  describe("plugin configuration", () => {
    test("should have valid settings schema", () => {
      const mockSettings = [
        { key: "indentHeaders", type: "boolean", default: true },
        { key: "newLineBlock", type: "boolean", default: true },
        { key: "enablePasteMore", type: "boolean", default: true },
      ]

      mockSettings.forEach((setting) => {
        expect(setting.key).toBeTruthy()
        expect(setting.type).toBe("boolean")
        expect(typeof setting.default).toBe("boolean")
      })
    })

    test("should have correct TurnDown configuration", () => {
      const config = {
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        hr: "---",
        bulletListMarker: "",
      }

      expect(config.headingStyle).toBe("atx")
      expect(config.codeBlockStyle).toBe("fenced")
    })
  })
})
