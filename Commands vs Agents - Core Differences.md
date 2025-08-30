## Commands vs Agents - Core Differences

**Slash Commands** (`/command-name`):
- Simple prompt templates stored in `.claude/commands/`
- Execute immediately when called
- Best for repetitive, standardized operations  
- No separate context - run in main conversation
- Support `$ARGUMENTS` for parameters

**Subagents** (agents):
- Specialized AI assistants with separate context windows
- Stored in `.claude/agents/` with custom system prompts
- Can be auto-invoked by Claude based on context matching
- Better for complex tasks requiring specialized expertise
- Can work autonomously and return results

## Making Agents More Intuitive

Instead of converting everything to one type, here are better approaches:

### 1. Make Agents More Proactive
Add keywords like `"use PROACTIVELY"` or `"MUST BE USED"` in agent descriptions to encourage automatic invocation:

```yaml
---
name: test-runner
description: Use PROACTIVELY to run tests and fix failures whenever code changes
---
```

### 2. Create Command Wrappers for Agents
Create slash commands that explicitly invoke specific agents:

```markdown
# .claude/commands/run-tests.md
Use the test-runner subagent to run tests in this project and fix any failures.
```

### 3. Hybrid Approach - Commands that Trigger Agent Workflows
Create commands that initiate multi-agent workflows:

```markdown
# .claude/commands/full-review.md  
Please review this code using:
1. The code-reviewer agent for quality analysis
2. The security-scanner agent for vulnerability checks
3. The performance-analyzer agent for optimization suggestions

Coordinate between these agents and provide a consolidated report.
```

## Practical Recommendations

**Keep Commands for**:
- Simple, immediate actions (`/optimize`, `/fix-lint`)
- Quick data retrieval (`/status`, `/logs`)
- Standardized workflows with consistent steps

**Keep Agents for**:
- Complex analysis requiring specialized knowledge
- Tasks that benefit from isolated context
- Multi-step processes that can run autonomously

**Consider a command naming convention**:
- `/run-xxx` for agent invocation commands
- `/get-xxx` for data retrieval commands  
- `/fix-xxx` for immediate action commands

The goal is making both types easily discoverable and intuitive to invoke, rather than forcing everything into one pattern. This gives you the flexibility to use the right tool for each type of task.