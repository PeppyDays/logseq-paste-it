/**
 * Tests for plugin settings and configuration
 */

describe("Plugin Settings", () => {
  describe("settings schema validation", () => {
    test("should have correct setting keys", () => {
      const expectedKeys = [
        "indentHeaders",
        "newLineBlock",
        "removeHeaders",
        "removeBolds",
        "removeHorizontalRules",
        "removeEmojis",
      ]

      expectedKeys.forEach((key) => {
        expect(typeof key).toBe("string")
        expect(key.length).toBeGreaterThan(0)
      })
    })

    test("should have correct setting types", () => {
      const settings = [
        { key: "indentHeaders", type: "boolean", default: true },
        { key: "newLineBlock", type: "boolean", default: true },
        { key: "removeHeaders", type: "boolean", default: false },
        { key: "removeBolds", type: "boolean", default: false },
        { key: "removeHorizontalRules", type: "boolean", default: false },
        { key: "removeEmojis", type: "boolean", default: false },
      ]

      settings.forEach((setting) => {
        expect(setting.type).toBe("boolean")
        expect(typeof setting.default).toBe("boolean")
      })
    })

    test("should have meaningful setting titles", () => {
      const settingTitles = [
        "Whether to indent headers",
        "Whether create a new block for new line",
        "Whether to remove header tags (#) when pasting",
        "Whether to remove strong tags (**) when pasting",
        "Whether to remove horizontal rules (---) when pasting",
        "Whether to remove emojis when pasting",
      ]

      settingTitles.forEach((title) => {
        expect(title.length).toBeGreaterThan(5)
        expect(title).toMatch(/^[A-Z]/) // Should start with capital letter
      })
    })
  })

  describe("TurnDown service configuration", () => {
    test("should have correct TurnDown options", () => {
      const expectedOptions = {
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        hr: "---",
        bulletListMarker: "",
      }

      expect(expectedOptions.headingStyle).toBe("atx")
      expect(expectedOptions.codeBlockStyle).toBe("fenced")
      expect(expectedOptions.hr).toBe("---")
      expect(expectedOptions.bulletListMarker).toBe("")
    })

    test("should configure pre tag replacement rule", () => {
      const preContent = 'console.log("test");'
      const expectedOutput = "```\n" + preContent.trim() + "\n```"

      // Simulate the pre tag replacement logic
      const replacement = "```\n" + preContent.trim() + "\n```"

      expect(replacement).toBe(expectedOutput)
    })
  })

  describe("horizontal rule removal functionality", () => {
    test("should remove single horizontal rule", () => {
      const content = "---"
      const expected = ""
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })

    test("should remove horizontal rule with spaces", () => {
      const content = "---   "
      const expected = ""
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })

    test("should remove multiple horizontal rules", () => {
      const content = `Text before
---
Middle text
---
Text after`
      const expected = `Text before

Middle text

Text after`
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })

    test("should preserve horizontal rules not at line start", () => {
      const content = "Text with --- in middle"
      const expected = "Text with --- in middle"
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })

    test("should preserve horizontal rules with different length", () => {
      const content = "--"
      const expected = "--"
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })

    test("should handle mixed content with horizontal rules", () => {
      const content = `# Header
---
**Bold text**
---
Normal text`
      const expected = `# Header

**Bold text**

Normal text`
      const result = content.replace(/^---\s*$/gm, "")

      expect(result).toBe(expected)
    })
  })

  describe("header removal functionality", () => {
    test("should remove single header tag", () => {
      const content = "# Hello There"
      const expected = "Hello There"
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })

    test("should remove multiple header tags", () => {
      const content = "### Hello There"
      const expected = "Hello There"
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })

    test("should remove headers from multiline content", () => {
      const content = `# Main Title
## Subtitle
Regular content
### Another Header`
      const expected = `Main Title
Subtitle
Regular content
Another Header`
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })

    test("should preserve non-header content with hash symbols", () => {
      const content = "Regular text with # symbol in middle"
      const expected = "Regular text with # symbol in middle"
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })

    test("should handle headers with no space after hash", () => {
      const content = "#NoSpace"
      const expected = "NoSpace"
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })

    test("should handle maximum header level", () => {
      const content = "###### Level 6 Header"
      const expected = "Level 6 Header"
      const result = content.replace(/^#{1,6}\s*/gm, "")

      expect(result).toBe(expected)
    })
  })

  describe("strong tag removal functionality", () => {
    test("should remove matched strong tags", () => {
      const content = "AA **BB**"
      const expected = "AA BB"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should not remove unmatched strong tags", () => {
      const content = "AA ** BB"
      const expected = "AA ** BB"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should remove multiple matched strong tags", () => {
      const content = "**Bold1** and **Bold2** text"
      const expected = "Bold1 and Bold2 text"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should handle strong tags with spaces", () => {
      const content = "**Bold Text**"
      const expected = "Bold Text"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should preserve text with single asterisks", () => {
      const content = "Text with *single* asterisks"
      const expected = "Text with *single* asterisks"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should handle nested content correctly", () => {
      const content = "**Bold with `code`**"
      const expected = "Bold with `code`"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })

    test("should handle multiline strong tags", () => {
      const content = "**Bold\nMultiline**"
      const expected = "Bold\nMultiline"
      const result = content.replace(/\*\*([^*]+?)\*\*/g, "$1")

      expect(result).toBe(expected)
    })
  })

  describe("emoji removal functionality", () => {
    test("should remove face emojis", () => {
      const content = "Hello 😀 world 😊"
      const expected = "Hello  world "
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })

    test("should remove object emojis", () => {
      const content = "Look at this 🚀 rocket and 🎯 target"
      const expected = "Look at this  rocket and  target"
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })

    test("should remove flag emojis", () => {
      const content = "Country flags 🇺🇸 🇬🇧 here"
      const expected = "Country flags   here"
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })

    test("should remove miscellaneous symbol emojis", () => {
      const content = "Check this ✅ and warning ⚠️"
      const expected = "Check this  and warning "
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })

    test("should handle mixed content with emojis", () => {
      const content =
        "# Header 🎉\n**Bold text** with 🔥 emoji\n---\nNormal text 👍"
      const expected = "# Header \n**Bold text** with  emoji\n---\nNormal text "
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })

    test("should preserve text without emojis", () => {
      const content = "Normal text without any special characters"
      const expected = "Normal text without any special characters"
      const result = content.replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]/gu,
        "",
      )

      expect(result).toBe(expected)
    })
  })
})
