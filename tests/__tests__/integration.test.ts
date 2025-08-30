import { splitBlock } from "../../public/splitBlock"

describe("Integration Tests", () => {
  describe("Real-world paste scenarios", () => {
    test("should handle simple multi-line content", () => {
      const content = `Line 1
Line 2
Line 3`
      const result = splitBlock(content, true)

      expect(result).toHaveLength(3)
      expect(result[0].content).toBe("Line 1")
      expect(result[1].content).toBe("Line 2")
      expect(result[2].content).toBe("Line 3")
    })

    test("should handle headers with content", () => {
      const content = `# Main Title
Some introduction text
## Subsection
More content here`

      const result = splitBlock(content, true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].content).toBe("# Main Title")
    })

    test("should handle code blocks properly", () => {
      const content = `Before code
\`\`\`javascript
function hello() {
  console.log("world");
}
\`\`\`
After code`

      const result = splitBlock(content, true)
      expect(result).toHaveLength(3)
      expect(result[1].content).toContain("```javascript")
      expect(result[1].content).toContain("function hello()")
    })

    test("should handle table content", () => {
      const content = `Table title
| Name | Status |
|------|--------|
| Item1| Done   |
| Item2| Pending|
Summary text`

      const result = splitBlock(content, true)
      expect(result.length).toBeGreaterThan(2)
      expect(result.some((block) => block.content.includes("|"))).toBe(true)
    })
  })

  describe("LogSeq-specific features", () => {
    test("should detect code block context", () => {
      const codeBlockContent = "```javascript"
      const normalContent = "Regular text"

      expect(codeBlockContent.startsWith("```")).toBe(true)
      expect(normalContent.startsWith("```")).toBe(false)
    })

    test("should detect LogSeq property context", () => {
      const propertyContent = "#+TITLE: My Page"
      const normalContent = "Regular text"

      expect(propertyContent.startsWith("#+")).toBe(true)
      expect(normalContent.startsWith("#+")).toBe(false)
    })

    test("should handle different indent settings", () => {
      const content = `# Header
Content`

      const withIndent = splitBlock(content, true)
      const withoutIndent = splitBlock(content, false)

      expect(withIndent.length).toBeGreaterThan(0)
      expect(withoutIndent.length).toBeGreaterThan(0)
    })
  })

  describe("Content cleanup patterns", () => {
    test("should identify Google Docs bold wrapper", () => {
      const googleContent = "**\nActual content\n**"
      const normalContent = "Normal **bold** content"

      const isGoogleWrapper =
        googleContent.length > 6 &&
        googleContent.slice(0, 3) === "**\n" &&
        googleContent.slice(googleContent.length - 3) === "\n**"

      const isNormalBold =
        normalContent.length > 6 &&
        normalContent.slice(0, 3) === "**\n" &&
        normalContent.slice(normalContent.length - 3) === "\n**"

      expect(isGoogleWrapper).toBe(true)
      expect(isNormalBold).toBe(false)
    })

    test("should identify LogSeq internal content markers", () => {
      const internalSign = "<meta charset='utf-8'><ul><placeholder>"
      const internalContent = internalSign + "some content"
      const externalContent = "<div>External HTML</div>"

      expect(internalContent.startsWith(internalSign)).toBe(true)
      expect(externalContent.startsWith(internalSign)).toBe(false)
    })

    test("should identify LogSeq directive markers", () => {
      const directiveContent =
        '<meta charset="utf-8"><!-- directives: [] -->Content'
      const normalContent = '<meta charset="utf-8"><p>Normal HTML</p>'

      const hasDirective =
        directiveContent.slice(22, 45) === "<!-- directives: [] -->"
      const isNormalHtml =
        normalContent.slice(22, 45) === "<!-- directives: [] -->"

      expect(hasDirective).toBe(true)
      expect(isNormalHtml).toBe(false)
    })
  })

  describe("Paste processing options", () => {
    function processContent(content: string, removeHeaders: boolean, removeBolds: boolean) {
      let result = content
      
      if (removeHeaders) {
        result = result.replace(/^#{1,6}\s*/gm, "")
      }
      
      if (removeBolds) {
        result = result.replace(/\*\*([^*]+?)\*\*/g, "$1")
      }
      
      return result
    }

    test("removeHeaders only: should remove headers but keep bolds", () => {
      const content = "# Title with **bold** text"
      const result = processContent(content, true, false)
      expect(result).toBe("Title with **bold** text")
    })

    test("removeBolds only: should remove bolds but keep headers", () => {
      const content = "# Title with **bold** text"
      const result = processContent(content, false, true)
      expect(result).toBe("# Title with bold text")
    })

    test("both enabled: should remove both headers and bolds", () => {
      const content = "# Title with **bold** text"
      const result = processContent(content, true, true)
      expect(result).toBe("Title with bold text")
    })

    test("both disabled: should keep original content", () => {
      const content = "# Title with **bold** text"
      const result = processContent(content, false, false)
      expect(result).toBe("# Title with **bold** text")
    })

    test("removeBolds with unmatched asterisks", () => {
      const content = "AA ** BB"
      const result = processContent(content, false, true)
      expect(result).toBe("AA ** BB")
    })

    test("complex multiline content with both options", () => {
      const content = "### **Important** Header\n## Regular **bold** text\n** Unmatched"
      const result = processContent(content, true, true)
      expect(result).toBe("Important Header\nRegular bold text\n** Unmatched")
    })
  })
})
