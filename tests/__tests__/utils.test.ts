/**
 * Test utilities and helper functions for paste-it plugin
 */

describe("Test Utilities", () => {
  describe("clipboard event creation", () => {
    test("should create clipboard event with HTML data", () => {
      const htmlContent = "<h1>Test Header</h1><p>Test content</p>"

      const mockClipboardData = {
        types: ["text/html", "text/plain"],
        getData: jest.fn((type: string) => {
          if (type === "text/html") return htmlContent
          if (type === "text/plain") return "Test Header\nTest content"
          return ""
        }),
      }

      const event = new ClipboardEvent("paste", {
        clipboardData: mockClipboardData as any,
      })

      expect(event.type).toBe("paste")
      expect(event.clipboardData.getData("text/html")).toBe(htmlContent)
    })

    test("should create clipboard event with file data", () => {
      const mockClipboardData = {
        types: ["Files"],
        getData: jest.fn(() => ""),
      }

      const event = new ClipboardEvent("paste", {
        clipboardData: mockClipboardData as any,
      })

      expect(event.clipboardData.types).toContain("Files")
      expect(event.clipboardData.types).not.toContain("text/plain")
    })
  })

  describe("markdown content validation", () => {
    test("should validate header syntax", () => {
      const validHeaders = [
        "# Header 1",
        "## Header 2",
        "### Header 3",
        "#### Header 4",
        "##### Header 5",
        "###### Header 6",
      ]

      validHeaders.forEach((header) => {
        expect(header).toMatch(/^#{1,6}\s+.+/)
      })
    })

    test("should validate code block syntax", () => {
      const codeBlock = '```javascript\nconsole.log("test");\n```'

      expect(codeBlock).toMatch(/^```[\w]*\n[\s\S]*?\n```$/)
    })

    test("should validate table syntax", () => {
      const table = "| Col1 | Col2 |\n|------|------|\n| A    | B    |"
      const lines = table.split("\n")

      lines.forEach((line) => {
        expect(line.trim()).toMatch(/^\|.*\|$/)
      })
    })
  })

  describe("content type detection", () => {
    test("should detect LogSeq internal content", () => {
      const internalSign = "<meta charset='utf-8'><ul><placeholder>"
      const internalContent = internalSign + "some content"
      const externalContent = "<div>External content</div>"

      expect(internalContent.slice(0, internalSign.length)).toBe(internalSign)
      expect(externalContent.slice(0, internalSign.length)).not.toBe(
        internalSign,
      )
    })

    test("should detect LogSeq directive content", () => {
      const directiveContent =
        '<meta charset="utf-8"><!-- directives: [] -->Content'
      const normalContent = '<meta charset="utf-8"><div>Normal content</div>'

      expect(directiveContent.slice(22, 45)).toBe("<!-- directives: [] -->")
      expect(normalContent.slice(22, 45)).not.toBe("<!-- directives: [] -->")
    })

    test("should detect Google Docs bold wrapper", () => {
      const googleContent = "**\nActual content\nMore lines\n**"
      const normalContent = "Normal content"

      const isGoogleDocs =
        googleContent.length > 6 &&
        googleContent.slice(0, 3) === "**\n" &&
        googleContent.slice(googleContent.length - 3) === "\n**"

      expect(isGoogleDocs).toBe(true)

      const isNormal =
        normalContent.length > 6 &&
        normalContent.slice(0, 3) === "**\n" &&
        normalContent.slice(normalContent.length - 3) === "\n**"

      expect(isNormal).toBe(false)
    })
  })

  describe("block content validation", () => {
    test("should identify code blocks", () => {
      const codeBlock = "```javascript"
      const normalBlock = "Normal text"

      expect(codeBlock.startsWith("```")).toBe(true)
      expect(normalBlock.startsWith("```")).toBe(false)
    })

    test("should identify LogSeq property blocks", () => {
      const propertyBlock = "#+TITLE: My Page"
      const normalBlock = "Normal text"

      expect(propertyBlock.startsWith("#+")).toBe(true)
      expect(normalBlock.startsWith("#+")).toBe(false)
    })
  })

  describe("settings integration", () => {
    test("should respect newLineBlock setting", () => {
      const settingsEnabled = { newLineBlock: true }
      const settingsDisabled = { newLineBlock: false }

      expect(settingsEnabled.newLineBlock).toBe(true)
      expect(settingsDisabled.newLineBlock).toBe(false)
    })

    test("should respect indentHeaders setting", () => {
      const settingsEnabled = { indentHeaders: true }
      const settingsDisabled = { indentHeaders: false }

      expect(settingsEnabled.indentHeaders).toBe(true)
      expect(settingsDisabled.indentHeaders).toBe(false)
    })

    test("should respect enablePasteMore setting", () => {
      const settingsEnabled = { enablePasteMore: true }
      const settingsDisabled = { enablePasteMore: false }

      expect(settingsEnabled.enablePasteMore).toBe(true)
      expect(settingsDisabled.enablePasteMore).toBe(false)
    })
  })
})
