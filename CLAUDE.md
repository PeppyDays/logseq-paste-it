# LogSeq Paste-It Plugin - Claude Code Documentation

## Project Overview

**Repository**: LogSeq Plugin - Enhanced Paste More
**Type**: LogSeq Application Plugin (Fork from paste-more)
**Purpose**: Retain formatting when pasting from external sources with content cleaning options (headers, bolds, horizontal rules, emojis)
**Architecture**: TypeScript plugin using WMR build system with TurnDown HTML→Markdown conversion

## Core Functionality

### Current Features

- **Rich Text Paste**: Converts HTML clipboard content to LogSeq-compatible markdown
- **Header Indentation**: Optional indentation of markdown headers (configurable)
- **Code Block Handling**: Preserves code blocks with proper formatting
- **Table Support**: Maintains table structure from Excel/Google Docs
- **Content Cleaning**: Optional removal of headers, bold text, horizontal rules, and emojis
- **Always Active**: Plugin is permanently enabled (no toggle controls)

## Architecture Analysis

### File Structure

```
paste-it/
├── public/
│   ├── index.ts          # Main plugin logic and paste handler
│   ├── splitBlock.ts     # Block splitting and hierarchy logic
│   ├── turndown.js       # HTML to Markdown conversion library
│   └── index.html        # Plugin entry point
├── package.json          # Dependencies and build config
├── tsconfig.json         # TypeScript configuration
└── .github/workflows/    # CI/CD for releases
```

### Key Components

#### 1. Main Plugin (`public/index.ts`)

- **Settings Schema**: 5 configurable options (indentHeaders, newLineBlock, removeHeaders, removeBolds, removeHorizontalRules, removeEmojis)
- **Paste Handler**: Intercepts clipboard events and processes HTML content
- **Always Active**: No UI controls, plugin runs automatically
- **TurnDown Integration**: Configures HTML→Markdown conversion rules

#### 2. Block Splitting Logic (`public/splitBlock.ts`)

- **Header Processing**: Handles markdown headers with indentation calculation (lines 62-74)
- **Code Block Grouping**: Preserves multi-line code blocks
- **Table Grouping**: Maintains table structure integrity
- **Hierarchy Management**: Creates proper parent-child block relationships

#### 3. HTML Conversion (`public/turndown.js`)

- **Header Rules**: Generates markdown headers with # symbols (line 108)
- **Escape Rules**: Protects existing # symbols from interference (line 724)

## Implementation Details

### Content Cleaning Pipeline

**Processing Flow**:

```
HTML → TurnDown (markdown) → Content Cleaning → splitBlock (hierarchy) → Header Removal (post-process) → LogSeq blocks
```

**Content Cleaning Order**:

1. Remove strong tags (\*\*) if `removeBolds` enabled
2. Remove horizontal rules (---) if `removeHorizontalRules` enabled
3. Remove emojis if `removeEmojis` enabled
4. Process through `splitBlock` for hierarchy
5. Remove headers (#) from final blocks if `removeHeaders` enabled (preserves indentation)

### Key Implementation Note

**Header Removal Timing**: Headers are removed AFTER `splitBlock` processing to preserve indentation hierarchy. This ensures that when `removeHeaders` is enabled, the content still gets proper indentation based on header levels, but the final output doesn't include the # symbols.

## Development Guidelines

### Build System

- **Framework**: WMR (Web Modules Runtime)
- **Commands**:
  - `yarn start` - Development server
  - `yarn build` - Production build
  - `yarn serve` - Serve built version

### Code Style

- **TypeScript**: Enabled with JSX support (Preact)
- **Formatting**: Prettier configured (.prettierrc)
- **Linting**: No explicit linter configuration found

### Testing Strategy

- **Automated Testing**: Jest test suite with 72 test cases covering all functionality
- **Unit Tests**: Content processing, settings validation, block structure
- **Integration Tests**: Header indentation with removal, content cleaning pipeline
- **Manual Testing**: Test pasting from various sources (Excel, Google Docs, GitHub)
- **Browser Testing**: Verify clipboard handling across browsers
- **LogSeq Integration**: Ensure compatibility with LogSeq block system

## Test Coverage

### Core Functionality Tests

- Block splitting and hierarchy creation
- Header processing with and without indentation
- Code block and table preservation
- Content type detection and Google Docs cleanup

### Content Cleaning Tests

- Header removal (single, multiple, multiline)
- Bold text removal (matched, unmatched, nested)
- Horizontal rule removal (single, multiple, mixed content)
- Emoji removal (faces, objects, flags, symbols, variation selectors)

### Integration Tests

- Header indentation with removal (regression prevention)
- Settings schema validation
- TurnDown service configuration

## Quality Considerations

### Code Quality

- **Strengths**: Clear separation of concerns, configurable behavior, robust error handling
- **Areas for Improvement**: Type safety (some @ts-ignore usage), code documentation

### Security

- **Safe**: No external network requests, no file system access beyond clipboard
- **Risk Assessment**: Low - plugin operates within LogSeq sandbox

### Performance

- **Efficient**: Event-driven paste handling, minimal DOM manipulation
- **Optimizations**: Direct markdown processing without unnecessary DOM traversal
