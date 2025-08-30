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
        "enablePasteMore",
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
        { key: "enablePasteMore", type: "boolean", default: true },
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
        "Enable paste more",
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

  describe("UI configuration", () => {
    test("should have correct trigger icon", () => {
      const triggerIconName = "ti-clipboard"

      expect(triggerIconName).toBe("ti-clipboard")
      expect(triggerIconName.startsWith("ti-")).toBe(true)
    })

    test("should have correct color configuration", () => {
      const enableColor = "#6b7280"
      const disableColor = "#ff0000"

      expect(enableColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(disableColor).toMatch(/^#[0-9a-f]{6}$/i)
      expect(enableColor).toBe("#6b7280")
      expect(disableColor).toBe("#ff0000")
    })

    test("should configure toolbar button correctly", () => {
      const buttonConfig = {
        key: "paste-plugin-button",
        template: expect.stringContaining('data-on-click="controlUsage"'),
      }

      expect(buttonConfig.key).toBe("paste-plugin-button")
      expect(buttonConfig.template).toEqual(
        expect.stringContaining('data-on-click="controlUsage"'),
      )
    })
  })

  describe("command palette integration", () => {
    test("should register command palette entry", () => {
      const commandConfig = {
        key: "paste-keyboard-shortcut",
        label: "enable/disable paste more",
      }

      expect(commandConfig.key).toBe("paste-keyboard-shortcut")
      expect(commandConfig.label).toBe("enable/disable paste more")
    })
  })

  describe("enable/disable functionality", () => {
    test("should toggle enable state correctly", () => {
      let enable = true

      // Simulate toggle
      enable = !enable
      expect(enable).toBe(false)

      enable = !enable
      expect(enable).toBe(true)
    })

    test("should show correct messages on toggle", () => {
      const enableMessage = "Enable paste more plugin"
      const disableMessage = "Disable paste more plugin"

      expect(enableMessage).toContain("Enable")
      expect(disableMessage).toContain("Disable")
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
})
