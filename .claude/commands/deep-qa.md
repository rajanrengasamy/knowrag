---
description: Run a deep QA review on a specific section of the task list against the PRD and Codebase.
argument-hint: <section_number>
---

You are a **QA Lead** coordinating a parallel quality review of **Section $1** of `tasks/tasks-knowrag-phase1.md`.

## Phase 1: Context Gathering

First, gather the necessary context:

1. Read `tasks/tasks-knowrag-phase1.md` and extract all tasks from **Section $1** (e.g., "7.0 Web Interface", "6.0 API Routes")
2. Read the PRD from the knowledge base artifact at `~/.gemini/antigravity/knowledge/knowrag_project_architecture/artifacts/implementation/PRD-v2.md` to understand the product requirements for this section
3. Identify all source files associated with Section $1 (use Glob/Grep to find them based on the "Relevant Files" section in the task list)
4. Create a summary of:
   - What the section is supposed to implement
   - Which files contain the implementation
   - Key requirements from the PRD

## Phase 2: Spawn QA Subagents

Once you have the context, use the **Task tool** to spawn **5 subagents in parallel** (in a single message with 5 Task tool calls). Each agent focuses on a specific QA dimension.

**IMPORTANT**: Launch all 5 agents in a SINGLE message to run them in parallel.

### Agent 1: PRD Compliance Reviewer
```
subagent_type: "feature-dev:code-reviewer"
prompt: |
  You are reviewing Section $1 of KnowRAG for PRD compliance.

  Context:
  - PRD: ~/.gemini/antigravity/knowledge/knowrag_project_architecture/artifacts/implementation/PRD-v2.md
  - TODO: tasks/tasks-knowrag-phase1.md (Section $1)
  - Files: [list the files you identified]

  Your task:
  1. Read the PRD requirements relevant to Section $1
  2. Read each implementation file
  3. Verify EVERY requirement is implemented correctly
  4. Check for missing features or incomplete implementations

  Report findings as a structured list with:
  - Requirement ID/description
  - Status: PASS/FAIL/PARTIAL
  - Evidence (code location or missing code)
  - Severity: CRITICAL/MAJOR/MINOR
```

### Agent 2: Error Handling & Edge Cases Reviewer
```
subagent_type: "feature-dev:code-reviewer"
prompt: |
  You are reviewing Section $1 of KnowRAG for error handling and edge cases.

  Files: [list the files you identified]

  Your task:
  1. Read each implementation file
  2. Identify all error paths and edge cases
  3. Verify proper error handling exists:
     - Are errors caught and handled appropriately?
     - Are error messages descriptive?
     - Are edge cases (null, undefined, empty arrays, etc.) handled?
     - Are API failures handled gracefully?
  4. Simulate failure modes mentally

  Report findings with:
  - Location (file:line)
  - Issue description
  - Suggested fix
  - Severity: CRITICAL/MAJOR/MINOR
```

### Agent 3: Type Safety Reviewer
```
subagent_type: "feature-dev:code-reviewer"
prompt: |
  You are reviewing Section $1 of KnowRAG for TypeScript type safety.

  Files: [list the files you identified]

  Your task:
  1. Read each implementation file
  2. Check for type safety issues:
     - Any use of `any` type
     - Missing type annotations
     - Incorrect type assertions
     - Potential runtime type errors
     - Zod schema alignment with TypeScript types
  3. Verify types flow correctly through the code

  Report findings with:
  - Location (file:line)
  - Issue description
  - Current code vs expected
  - Severity: CRITICAL/MAJOR/MINOR
```

### Agent 4: Architecture & Code Quality Reviewer
```
subagent_type: "feature-dev:code-reviewer"
prompt: |
  You are reviewing Section $1 of KnowRAG for architecture and code quality.

  Files: [list the files you identified]

  Your task:
  1. Read each implementation file
  2. Evaluate:
     - Code organization and modularity
     - Separation of concerns
     - Naming conventions (functions, variables, files)
     - Code duplication
     - Function complexity (too long? too many params?)
     - Consistency with project patterns
  3. Compare against other parts of the codebase for consistency

  Report findings with:
  - Location (file:line)
  - Issue description
  - Recommendation
  - Severity: CRITICAL/MAJOR/MINOR
```

### Agent 5: Security Reviewer
```
subagent_type: "feature-dev:code-reviewer"
prompt: |
  You are reviewing Section $1 of KnowRAG for security vulnerabilities.

  Files: [list the files you identified]

  Your task:
  1. Read each implementation file
  2. Check for OWASP Top 10 vulnerabilities:
     - Injection risks (command, SQL, etc.)
     - Sensitive data exposure
     - Security misconfigurations
     - Input validation issues
  3. Check for:
     - Hardcoded secrets or credentials
     - Unsafe API key handling (OPENAI_API_KEY, GOOGLE_API_KEY)
     - Unsafe data serialization
     - Rate limiting considerations

  Report findings with:
  - Location (file:line)
  - Vulnerability type
  - Risk assessment
  - Recommended fix
  - Severity: CRITICAL/MAJOR/MINOR
```

## Phase 3: Consolidate Results

After all 5 agents complete:

1. Collect all findings from each agent
2. Create `docs/Section$1-QA-Issues.md` with:
   - Executive summary (total issues by severity)
   - Section for each reviewer's findings
   - Prioritized action items
3. If no issues found across all agents, state "QA Passed" with evidence

## Execution Checklist

- [ ] Context gathered (files identified, PRD understood)
- [ ] All 5 agents launched in parallel (single message)
- [ ] All agent results collected
- [ ] Consolidated report created at `docs/Section$1-QA-Issues.md`
- [ ] Summary provided to user
