/**
 * Test Script for LLM Integration
 * 
 * Tests both Gemini and OpenAI integrations with hardcoded context
 * to verify citation format and proper response generation.
 * 
 * Usage: npx tsx scripts/test-llm.ts [--model gemini|openai|both]
 */

import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { generateFullResponse, generateResponse, AVAILABLE_MODELS, LLMError, formatErrorMessage } from "../lib/llm";
import { generateSystemPromptFromSources, ContextSource } from "../lib/prompts/rag-prompt";

// Test context simulating retrieved chunks from "The Intelligent Investor"
const TEST_CONTEXT: ContextSource[] = [
    {
        text: "The margin of safety is always dependent on the price paid. It will be large at one price, small at some higher price, nonexistent at some still higher price. The investor who insists on a margin of safety in all his commitments will inevitably earn a satisfactory return over time.",
        source: "The Intelligent Investor - BENJAMIN GRAHAM.pdf",
        page: 512,
        chunkIndex: 1024,
    },
    {
        text: "Investment is most intelligent when it is most businesslike. If a person sets out to make profits from security purchases and sales, he is embarking on a business venture of his own. He should study the companies carefully before buying.",
        source: "The Intelligent Investor - BENJAMIN GRAHAM.pdf",
        page: 523,
        chunkIndex: 1047,
    },
    {
        text: "Let us imagine that you and a private business partner own equal shares in a business whose underlying value is $1,000. Every day, the partner named Mr. Market shows up and offers to buy your share or sell you his share at a price that he determines.",
        source: "The Intelligent Investor - BENJAMIN GRAHAM.pdf",
        page: 204,
        chunkIndex: 408,
    },
];

// Test query
const TEST_QUERY = "What is the margin of safety and why is it important?";

// Test query that should return "no information"
const OUT_OF_SCOPE_QUERY = "What is the best cryptocurrency to invest in?";

/**
 * Tests streaming response from a model
 */
async function testStreamingResponse(modelId: "gemini" | "openai"): Promise<void> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing ${modelId.toUpperCase()} Streaming Response`);
    console.log("=".repeat(60));

    const systemPrompt = generateSystemPromptFromSources(TEST_CONTEXT);

    console.log("\nQuery:", TEST_QUERY);
    console.log("\nStreaming response:\n");

    let fullResponse = "";

    try {
        for await (const chunk of generateResponse(modelId, systemPrompt, TEST_QUERY)) {
            if (!chunk.done) {
                process.stdout.write(chunk.text);
                fullResponse += chunk.text;
            }
        }
        console.log("\n");

        // Verify citation format
        const hasCitation = fullResponse.includes("(The Intelligent Investor") ||
            fullResponse.includes("(p.") ||
            fullResponse.includes("page");
        console.log(`✓ Citation check: ${hasCitation ? "PASS - Found citations" : "WARN - No standard citations found"}`);

    } catch (error) {
        if (error instanceof LLMError) {
            console.error(`\n❌ Error: ${formatErrorMessage(error)}`);
            throw error;
        }
        throw error;
    }
}

/**
 * Tests non-streaming response from a model
 */
async function testFullResponse(modelId: "gemini" | "openai"): Promise<void> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing ${modelId.toUpperCase()} Full Response`);
    console.log("=".repeat(60));

    const systemPrompt = generateSystemPromptFromSources(TEST_CONTEXT);

    console.log("\nQuery:", TEST_QUERY);
    console.log("\nGenerating full response...\n");

    try {
        const response = await generateFullResponse(modelId, systemPrompt, TEST_QUERY);
        console.log(response);
        console.log("\n");

        // Verify citation format
        const hasCitation = response.includes("(The Intelligent Investor") ||
            response.includes("(p.") ||
            response.includes("page");
        console.log(`✓ Citation check: ${hasCitation ? "PASS - Found citations" : "WARN - No standard citations found"}`);

    } catch (error) {
        if (error instanceof LLMError) {
            console.error(`\n❌ Error: ${formatErrorMessage(error)}`);
            throw error;
        }
        throw error;
    }
}

/**
 * Tests out-of-scope query handling
 */
async function testOutOfScopeQuery(modelId: "gemini" | "openai"): Promise<void> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing ${modelId.toUpperCase()} Out-of-Scope Response`);
    console.log("=".repeat(60));

    const systemPrompt = generateSystemPromptFromSources(TEST_CONTEXT);

    console.log("\nQuery:", OUT_OF_SCOPE_QUERY);
    console.log("\nGenerating response...\n");

    try {
        const response = await generateFullResponse(modelId, systemPrompt, OUT_OF_SCOPE_QUERY);
        console.log(response);
        console.log("\n");

        // Should acknowledge lack of information
        const acknowledgesNoInfo = response.toLowerCase().includes("don't have") ||
            response.toLowerCase().includes("no information") ||
            response.toLowerCase().includes("not found") ||
            response.toLowerCase().includes("cannot find") ||
            response.toLowerCase().includes("doesn't contain");
        console.log(`✓ Out-of-scope check: ${acknowledgesNoInfo ? "PASS - Properly acknowledged missing info" : "WARN - May have hallucinated"}`);

    } catch (error) {
        if (error instanceof LLMError) {
            console.error(`\n❌ Error: ${formatErrorMessage(error)}`);
            throw error;
        }
        throw error;
    }
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║           KnowRAG LLM Integration Test Suite               ║");
    console.log("╚════════════════════════════════════════════════════════════╝");

    // Parse command line args
    const args = process.argv.slice(2);
    const modelArg = args.find(arg => arg.startsWith("--model="))?.split("=")[1] || "both";

    console.log("\nAvailable models:");
    for (const model of AVAILABLE_MODELS) {
        console.log(`  - ${model.id}: ${model.name} (${model.provider})`);
    }

    const modelsToTest: ("gemini" | "openai")[] =
        modelArg === "both" ? ["gemini", "openai"] : [modelArg as "gemini" | "openai"];

    console.log(`\nTesting model(s): ${modelsToTest.join(", ")}`);

    let passCount = 0;
    let failCount = 0;

    for (const modelId of modelsToTest) {
        try {
            // Test streaming
            await testStreamingResponse(modelId);
            passCount++;

            // Test out-of-scope
            await testOutOfScopeQuery(modelId);
            passCount++;

        } catch (error) {
            failCount++;
            console.error(`\n❌ ${modelId} tests failed`);
            if (error instanceof Error) {
                console.error(`   Error: ${error.message}`);
            }
        }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✓ Passed: ${passCount}`);
    console.log(`✗ Failed: ${failCount}`);

    if (failCount > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
});
